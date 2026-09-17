import { useEffect, useState } from "react";
import { get, post } from "./api";
import { Layout } from "./components/Layout";
import { AdminPage } from "./pages/Admin";
import { LoginPage, RegisterPage } from "./pages/Auth";
import { BookingsPage } from "./pages/Bookings";
import { ClassroomsPage } from "./pages/Classrooms";
import { ConfirmationPage } from "./pages/Confirmation";
import { DashboardPage } from "./pages/Dashboard";
import { NotificationsPage } from "./pages/Notifications";
import { ProfilePage } from "./pages/Profile";
import { SchedulePage } from "./pages/Schedule";
import type { Booking, User } from "./types";

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [page, setPage] = useState(user ? "dashboard" : "login");
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(
    null,
  );

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastBooking");
    setUser(null);
    setPage("login");
  };
  const logout = async () => {
    try {
      await post("/auth/logout");
    } catch {
      // Local logout must still succeed if the token has expired or API is offline.
    } finally {
      clearSession();
    }
  };
  const login = (nextUser: User) => {
    setUser(nextUser);
    localStorage.setItem("user", JSON.stringify(nextUser));
    setPage("dashboard");
  };
  const updateUser = (nextUser: User) => {
    setUser(nextUser);
    localStorage.setItem("user", JSON.stringify(nextUser));
  };
  const bookingCreated = (booking: Booking) => {
    setConfirmedBooking(booking);
    localStorage.setItem("lastBooking", JSON.stringify(booking));
    setPage("confirmation");
  };

  useEffect(() => {
    const expire = () => clearSession();
    window.addEventListener("auth-expired", expire);
    if (localStorage.getItem("token")) {
      get<User>("/auth/me")
        .then((current) => {
          setUser(current);
          localStorage.setItem("user", JSON.stringify(current));
        })
        .catch(() => clearSession());
    }
    return () => window.removeEventListener("auth-expired", expire);
  }, []);

  if (!user) {
    return page === "register" ? (
      <RegisterPage onLogin={() => setPage("login")} />
    ) : (
      <LoginPage onLogin={login} onRegister={() => setPage("register")} />
    );
  }

  return (
    <Layout user={user} page={page} navigate={setPage} signOut={logout}>
      {page === "dashboard" && <DashboardPage user={user} navigate={setPage} />}
      {page === "classrooms" && <ClassroomsPage onBooked={bookingCreated} />}
      {page === "schedule" && <SchedulePage onBooked={bookingCreated} />}
      {page === "confirmation" && confirmedBooking && (
        <ConfirmationPage
          booking={confirmedBooking}
          onBack={() => setPage("bookings")}
          onNew={() => setPage("classrooms")}
        />
      )}
      {page === "bookings" && <BookingsPage user={user} />}
      {page === "notifications" && <NotificationsPage />}
      {page === "profile" && <ProfilePage user={user} onUpdate={updateUser} />}
      {page === "admin" && user.role === "ADMIN" && <AdminPage />}
    </Layout>
  );
}
