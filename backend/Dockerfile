# =====================================================================
# Backend Desafio Tecnico — Dockerfile multi-stage
# =====================================================================
# Build: dotnet publish -> Runtime: aspnet 8.0 slim
# Porta padrão: 8080 (Render setará via PORT env var, mas 8080 fixo serve)
# =====================================================================

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Cache de restore — copia primeiro os .csproj e restaura
COPY ["DesafioMt.sln", "./"]
COPY ["src/DesafioMt.Domain/DesafioMt.Domain.csproj", "src/DesafioMt.Domain/"]
COPY ["src/DesafioMt.Application/DesafioMt.Application.csproj", "src/DesafioMt.Application/"]
COPY ["src/DesafioMt.Infrastructure/DesafioMt.Infrastructure.csproj", "src/DesafioMt.Infrastructure/"]
COPY ["src/DesafioMt.Api/DesafioMt.Api.csproj", "src/DesafioMt.Api/"]
RUN dotnet restore "src/DesafioMt.Api/DesafioMt.Api.csproj"

# Copia o resto do código e compila
COPY src/ src/
WORKDIR /src/src/DesafioMt.Api
RUN dotnet publish -c Release -o /app/publish --no-restore /p:UseAppHost=false

# =====================================================================
# Stage final — imagem leve só com runtime
# =====================================================================
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Copia os binários publicados
COPY --from=build /app/publish .

# Render injeta PORT como env var. Configuramos para escutar em $PORT ou 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

ENTRYPOINT ["dotnet", "DesafioMt.Api.dll"]
