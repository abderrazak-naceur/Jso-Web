"""CI-only HTTP checks against the disposable, migrated PostgreSQL API."""
import json
import os
import secrets
import urllib.error
import urllib.request
import uuid

BASE = "http://127.0.0.1:5080/api"
ADMIN = os.environ["FUNDRAISING_TEST_ADMIN_TOKEN"]
FAN = os.environ["FUNDRAISING_TEST_FAN_TOKEN"]


def request(path, *, method="GET", body=None, admin=False, fan=False, access=None, status=200):
    headers = {"Content-Type": "application/json"}
    if admin:
        headers["Authorization"] = f"Bearer {ADMIN}"
    elif fan:
        headers["Authorization"] = f"Bearer {FAN}"
    if access:
        headers["X-Fundraising-Token"] = access
    req = urllib.request.Request(
        BASE + path, data=json.dumps(body).encode() if body is not None else None,
        headers=headers, method=method,
    )
    try:
        response = urllib.request.urlopen(req, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        data = response.read()
        assert response.status == status, (path, response.status, data.decode())
        return json.loads(data) if data else None


print("fundraising-smoke: start", flush=True)
assert os.environ.get("CI") == "true", "Use only the disposable CI database."
request("/admin/fundraising/projects", status=401)
project_body = {
    "title": "CI disposable fundraising project", "description": "PostgreSQL integration check",
    "budgetTnd": 1000, "durationMonths": 10, "templateId": "bus", "status": "Draft",
}
project = request("/admin/fundraising/projects", method="POST", body=project_body, admin=True)
project_id = project["id"]
public_path = f"/fundraising/projects/{project_id}"
request(public_path, status=404)
assert not any(p["id"] == project_id for p in request("/fundraising/projects"))
project_body["status"] = "Published"
request(f"/admin/fundraising/projects/{project_id}", method="PUT", body=project_body, admin=True)
assert request(public_path)["totalPaidTnd"] == 0
print("fundraising-smoke: project visibility passed", flush=True)

first_installment = None
first_commitment = None
first_access = None
last_commitment = None
for amount in (5, 10, 20, 30, 50):
    access = secrets.token_urlsafe(32)
    join_body = {
        "clientRequestId": str(uuid.uuid4()), "accessToken": access,
        "displayName": f"CI supporter {amount}", "monthlyAmountTnd": amount,
        "paymentMethod": "Cash", "phone": "+21600000000", "email": "ci@example.invalid",
    }
    commitment = request(public_path + "/commitments", method="POST", body=join_body, status=201)
    last_commitment = commitment["id"]
    retry = request(public_path + "/commitments", method="POST", body=join_body)
    assert retry["id"] == commitment["id"]
    assert len(commitment["installments"]) == 10
    assert sum(i["amount"] for i in commitment["installments"]) == amount * 10
    assert all(i["paymentStatus"] == "Pending" and i["paidAt"] is None for i in commitment["installments"])
    private_path = f'/fundraising/commitments/{commitment["id"]}'
    request(private_path, status=401)
    assert request(private_path, access=access)["id"] == commitment["id"]
    if first_installment is None:
        first_installment = commitment["installments"][0]["id"]
        first_commitment = commitment["id"]
        first_access = access

summary = request(public_path)
assert summary["supporterCount"] == 5 and summary["totalPaidTnd"] == 0
print("fundraising-smoke: commitments creation passed", flush=True)
supporters = request(public_path + "/supporters")
assert supporters["totalCount"] == 5
assert all(not {"email", "phone", "accessTokenHash"}.intersection(row) for row in supporters["items"])
request(f"/admin/donations/{first_installment}/confirm-cash", method="POST", admin=True)
summary = request(public_path)
assert summary["totalPaidTnd"] == 5 and summary["paidSupporterCount"] == 1
assert summary["paidInstallmentCount"] == 1
request(f"/admin/donations/{first_installment}/confirm-cash", method="POST", admin=True, status=400)
assert request(public_path)["totalPaidTnd"] == 5
print("fundraising-smoke: cash confirmation passed", flush=True)

request(public_path + "/commitments", method="POST", status=201, body={
    "clientRequestId": str(uuid.uuid4()), "accessToken": secrets.token_urlsafe(32),
    "displayName": "CI online pending", "monthlyAmountTnd": 20, "paymentMethod": "Online",
})
assert request(public_path + "/supporters")["totalCount"] == 5
assert request(public_path)["totalPaidTnd"] == 5
print("fundraising-smoke: online pending passed", flush=True)

# Claim uses real PostgreSQL conditional updates and a single transaction.
claim_path = f"/fundraising/commitments/{first_commitment}/claim"
request(claim_path, method="POST", access=first_access, status=401)
request(claim_path, method="POST", fan=True, status=401)
assert request(claim_path, method="POST", fan=True, access=first_access)["claimed"]
owned = next(item for item in request("/fundraising/mine", fan=True) if item["id"] == first_commitment)
assert len(owned["installments"]) == 10
assert sum(item["amount"] for item in owned["installments"] if item["paymentStatus"] == "Paid") == 5
print("fundraising-smoke: claim flow passed", flush=True)

# Paid histories survive archiving; unstarted test projects can be removed.
admin_path = f"/admin/fundraising/projects/{project_id}"
request(admin_path, method="DELETE", admin=True, status=409)
request(admin_path + "/archive", method="POST", admin=True)
request(public_path, status=404)
assert any(item["id"] == first_commitment for item in request("/fundraising/mine", fan=True))
print("fundraising-smoke: archive passed", flush=True)
request(f"{admin_path}/commitments/{last_commitment}", method="DELETE", admin=True, status=204)
project_body["status"] = "Published"
disposable = request("/admin/fundraising/projects", method="POST", body=project_body, admin=True)
disposable_commitment = request(f'/fundraising/projects/{disposable["id"]}/commitments', method="POST", status=201, body={
    "clientRequestId": str(uuid.uuid4()), "accessToken": secrets.token_urlsafe(32),
    "displayName": "CI disposable unpaid", "monthlyAmountTnd": 5, "paymentMethod": "Cash",
})
request(f'/admin/fundraising/projects/{disposable["id"]}', method="DELETE", admin=True, status=204)
request(f'/fundraising/commitments/{disposable_commitment["id"]}', status=404)
print("fundraising-smoke: cleanup passed", flush=True)
print("Fundraising PostgreSQL HTTP checks passed: plans, retries, privacy, cash, claim, archive, protected deletion.")
