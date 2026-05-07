import { useEffect, useState } from "react";
import { supabase } from "../../supabase";

export default function UserManagement() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });

    console.log(data);

    if (error) {
      console.error("Error fetching users:", error.message);
    } else {
      setUsers(data);
    }
  };

  return (
    <main className="dashboard-container">

      {/* HERO */}
      <section className="hero-section">
        <span className="hero-kicker">ADMIN</span>

        <h1 className="hero-title">
          User Management
        </h1>

        <p className="hero-description">
          View and manage all platform users.
        </p>
      </section>

      {/* USERS */}
      <section className="feed-outer-section">

        {users.length === 0 && (
          <p>No users found.</p>
        )}

        {users.map((user) => (
          <article key={user.id} className="action-block">

            <h3>{user.full_name}</h3>

            <p>
              <strong>Role:</strong> {user.role}
            </p>

            <p>
              <strong>Campus:</strong> {user.campus}
            </p>

            <p>
              <strong>User ID:</strong> {user.id}
            </p>

          </article>
        ))}

      </section>

    </main>
  );
}