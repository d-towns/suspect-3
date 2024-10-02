import * as ReactDOM from "react-dom/client";
import {
  RouterProvider,
} from "react-router-dom";
import "./index.css";

import { AuthProvider } from "./context/auth.context";

import router from "./routing/router";
ReactDOM.createRoot(document.getElementById("root")!).render(
    <AuthProvider>
    <RouterProvider router={router} />
    </AuthProvider>
);