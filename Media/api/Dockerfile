FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Media/api/ ./Media/api/
WORKDIR /src/Media/api
RUN dotnet restore JSO.Media.Api.csproj
RUN dotnet publish JSO.Media.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000
ENTRYPOINT ["dotnet", "JSO.Media.Api.dll"]
