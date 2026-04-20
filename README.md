<p align="center">
  <img src="public/mascot.png" alt="Project Logo" width="175">
  <br>
  <i>Shyntr - Dashboard</i>
</p>

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![Yarn](https://img.shields.io/badge/yarn-1.22.x-orange.svg)
![React](https://img.shields.io/badge/React-18-61dafb.svg?logo=react)

The **Shyntr Dashboard** is the central management interface for the Shyntr Identity Hub. It provides a highly intuitive, enterprise-grade admin portal to manage Tenants, OIDC/SAML Connections (IdPs), Service Providers (Clients), and advanced Identity Broker mapping rules.

## ✨ Features
* **Multi-Tenant Management:** Complete isolation and control over distinct organizational units.
* **Identity Broker Configuration:** Easily map and translate protocols (OIDC ➔ SAML, SAML ➔ OIDC).
* **Advanced Attribute Mapping:** Visual rule editor for dynamic claims translation, fallbacks, and type casting.
* **Modern UI/UX:** Built with Tailwind CSS and Shadcn UI for a sleek, responsive experience.

## 🚀 Tech Stack
* **Framework:** React (Single Page Application)
* **Styling:** Tailwind CSS, DaisyUI, Shadcn UI
* **Package Manager:** Yarn (v1.22.x)
* **Deployment:** Docker (Multi-stage build with Nginx)

## 🛠️ Getting Started (Local Development)

### Prerequisites
* Node.js v22.x
* Yarn v1.22.x

### Installation
1. Clone the repository:
   ```bash
   git clone [https://github.com/shyntr/shyntr-dashboard.git](https://github.com/shyntr/shyntr-dashboard.git)
   cd shyntr-dashboard
   ```
2. Install dependencies (using frozen lockfile for consistency):

    ```bash
    yarn install --frozen-lockfile
    ```

3. Start the development server:

    ```bash
    yarn start
    ```

4. Open http://localhost:3274 in your browser.

## 🐳 Docker Production Build
The application is optimized for production using a multi-stage Docker build served via Nginx.

```bash
# Build the image
docker build -t shyntr/shyntr-dashboard:latest .

# Run the container
docker run -d -p 3000:80 -e REACT_APP_BACKEND_URL="https://shyntr-api.domain.com" \ --name shyntr-dashboard shyntr/shyntr-dashboard:latest
```

## 🔄 CI/CD Pipeline
This repository includes a fully automated GitHub Actions pipeline. Pushing a SemVer tag (e.g., v1.0.0) will automatically trigger:

* Code quality checks.
* Multi-architecture Docker builds (AMD64 & ARM64).
* Publishing to Docker Hub.
* GitHub Release creation with automated changelogs.

---

## 🤝 Contributing

We love community! 💖

Found a bug? Have a great idea? Feel free to jump in! We appreciate every piece of feedback and contribution.
Let's build the ultimate Identity Broker together! 🚀

## 📄 License

Free as in freedom! 🦅

Shyntr is proudly open-source and licensed under the **Apache-2.0** license.
Check the [LICENSE](https://github.com/Shyntr/shyntr/blob/main/LICENSE) file for the boring legal details.

---

<div>
  <a href="https://buymeacoffee.com/nevzatcirak17" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="40" align="left">
  </a>
  <a href="https://nevzatcirak.com" target="_blank">
    <img src="public/nev.svg" alt="NEV Logo" height="40" align="right">
  </a>
</div>
<br clear="all">