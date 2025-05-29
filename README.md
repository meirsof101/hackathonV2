# AgriConnect

AgriConnect is a web platform designed to empower farmers by providing tools for farm management, community networking, and marketplace connections. The platform enables farmers to register, manage their farm data, connect with other farmers, and access a digital marketplace for buying and selling agricultural products.

## Features

- **Farmer Registration & Login:** Secure authentication for farmers.
- **Dashboard:** View and manage farm profile, quick actions, and recent activity.
- **Marketplace:** Buy and sell crops, equipment, and supplies.
- **Farm Management:** Track crops, activities, and finances.
- **Community:** Connect with other farmers and participate in discussions.
- **Responsive Design:** Works well on desktop and mobile devices.

## Project Structure

```
agriconnect/
├── public/
│   ├── dashboard.html
│   ├── index.html
│   ├── login.html
│   ├── market.html
│   ├── register.html
│   ├── script.js
│   ├── style.css
│   └── Images/
│       ├── agricconnect.jpg
│       ├── bg1.png
│       ├── bg2.png
│       └── bg3.png
├── server.js
├── package.json
└── agriconnect.db
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [npm](https://www.npmjs.com/)
- [SQLite3](https://www.sqlite.org/)

### Installation

1. **Clone the repository:**
   ```sh
   git clone https://github.com/yourusername/agriconnect.git
   cd agriconnect
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Start the server:**
   ```sh
   npm start
   ```
   The server will run at [http://localhost:3000](http://localhost:3000).

4. **Access the app:**
   - Open your browser and go to [http://localhost:3000](http://localhost:3000)

## Usage

- **Register:** Create a new farmer account via the Register page.
- **Login:** Access your dashboard after logging in.
- **Dashboard:** View your farm profile and quick actions.
- **Marketplace:** Browse, add, and filter agricultural products.
- **Logout:** Securely log out from your account.

## Technologies Used

- Node.js
- Express.js
- SQLite3
- HTML5, CSS3, JavaScript (Vanilla)

## Folder Descriptions

- [`public/`](public/) - Static frontend files (HTML, CSS, JS, images)
- [`server.js`](server.js) - Main Express server and API routes
- [`agriconnect.db`](agriconnect.db) - SQLite database file

## License

This project is licensed under the MIT License.

---

**AgriConnect** - Empowering farmers with smart market connections.