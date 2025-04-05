import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// The following is for development mode
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // The server field is used to configure the development server that Vite spins up when you run your application in development mode. 
  // Specifically, the server field allows you to define settings related to how the server behaves, such as port configuration, proxy rules, and more.
  server: {
    port: 3000, // The port field is used to specify the port on which the Vite development server should run.
    proxy: { // The proxy field is used to define proxy rules for the development server. This is useful when you need to forward certain requests from the Vite development server to another server (e.g., a backend API server) to avoid CORS issues or to mimic a production environment during development.
      '/api': { // This is the path prefix that Vite will look for to determine if a request should be proxied. For example, if your frontend makes a request to /api/users, Vite will forward that request to http://localhost:5000/api/users.
        target: 'http://localhost:5000',
        changeOrigin: true,
        // What is changeOrigin?
        //   Purpose: When set to true, changeOrigin modifies the Origin header of the request to match the target server's origin. This is often necessary when the target server (e.g., a backend API) is hosted on a different domain, port, or protocol than the frontend application.
        //   Default Value: If not specified, changeOrigin defaults to false.
      }
    }
  }
})
