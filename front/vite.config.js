import { defineConfig, loadEnv } from "vite";
import path from "path";
import dotenv from "dotenv";

export default defineConfig(({ command, mode, ssrBuild }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), "");
  dotenv.config({
    path: path.join(path.resolve(), ".env"),
  });
  return {
    // vite config
    define: {
      __APP_ENV__: env.APP_ENV,
    },
    server: {
      host: process.env.HOST,
      port: process.env.PORT,
      proxy: {
        // "/api": {
        //   target: "http://jsonplaceholder.typicode.com",
        //   changeOrigin: true,
        //   rewrite: (path) => path.replace(/^\/api/, ""),
        // },
      },
      watch: {
        usePolling: true,
      },
    },
  };
});
