import { createBrowserRouter } from "react-router";
import { Login } from "./components/Login";
import { Home } from "./components/Home";
import { Feed } from "./components/Feed";
import { Wheel } from "./components/Wheel";
import { Filter } from "./components/Filter";
import { Messages } from "./components/Messages";
import { ErrorBoundary } from "./components/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Login,
    ErrorBoundary: ErrorBoundary,
  },
  {
    path: "/home",
    Component: Home,
    ErrorBoundary: ErrorBoundary,
  },
  {
    path: "/feed",
    Component: Feed,
    ErrorBoundary: ErrorBoundary,
  },
  {
    path: "/wheel",
    Component: Wheel,
    ErrorBoundary: ErrorBoundary,
  },
  {
    path: "/filter",
    Component: Filter,
    ErrorBoundary: ErrorBoundary,
  },
  {
    path: "/messages",
    Component: Messages,
    ErrorBoundary: ErrorBoundary,
  },
]);