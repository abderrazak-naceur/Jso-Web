namespace JSO.Domain;

// User-generated fan photos with mandatory moderation (idea A2): fans upload
// photos from the stadium/away trips, the editorial team moderates them and a
// curated community gallery is published. It boosts belonging and provides free
// content at essentially zero cost by reusing the existing MediaAsset storage.
//
// Moderation is MANDATORY before publication: a photo starts in "Pending" and
// only surfaces in the public gallery once a CommunityManager/Editor sets it to
// "Approved". Rejected photos never become public.
//
// Privacy / GDPR: uploading implies consent to publication in the community
// gallery, and a fan can request removal at any time (right to erasure). Extra
// care is needed for photos featuring minors' faces: publication consent is the
// uploader's responsibility and moderators must reject anything doubtful. The
// public gallery exposes NO PII of the fan (no email/identity) beyond, at most,
// a freely chosen display name if a future iteration adds one; by default only
// the media URL, caption and date are surfaced.
public sealed class FanPhoto
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Owner of the submission, always resolved from the authenticated Fan token
    // claim, never from client input.
    public Guid FanUserId { get; set; }

    // Logical FK to the MediaAsset that holds the stored image (reused storage).
    public Guid MediaAssetId { get; set; }

    // Optional free-text caption chosen by the fan.
    public string? Caption { get; set; }

    // Moderation state: Pending / Approved / Rejected. Only Approved is public.
    public string Status { get; set; } = "Pending";

    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;

    // Audit of the moderation decision: which admin acted and when. Null while
    // the photo is still pending.
    public string? ModeratedByAdminId { get; set; }

    public DateTimeOffset? ModeratedAt { get; set; }
}
