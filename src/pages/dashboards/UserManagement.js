import { useEffect, useState } from "react";
import { supabase } from "../../supabase";
import "./AdminDashboard.css";
import "./UserManagement.css";
export default function UserManagement() {
  const [users, setUsers] = useState([]);
const [searchTerm, setSearchTerm] = useState("");
  useEffect(() => {
    fetchUsers();
  }, []);
const filteredUsers = users.filter((user) =>
  user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  user.role?.toLowerCase().includes(searchTerm.toLowerCase())
);
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
const suspendUser = async (id) => {
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: true })
    .eq("id", id);

  if (error) {
    console.error("Suspend error:", error.message);
  } else {
    fetchUsers();
  }
};

const unbanUser = async (id) => {
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: false })
    .eq("id", id);

  if (error) {
    console.error("Unban error:", error.message);
  } else {
    fetchUsers();
  }
};
const deleteUser = async (id) => {

  const confirmDelete = window.confirm(
    "Are you sure you want to delete this user?"
  );

  if (!confirmDelete) return;

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete error:", error.message);
  } else {
    fetchUsers();
  }
};
const UserActionButtons = ({ user, suspendUser, unbanUser, deleteUser }) => {
  return (
    <section className="user-action-buttons">

      {user.is_banned ? (
        <button
          className="reactivate-btn"
          onClick={() => unbanUser(user.id)}
        >
          Reactivate
        </button>
      ) : (
        <button
          className="suspend-btn"
          onClick={() => suspendUser(user.id)}
        >
          Suspend
        </button>
      )}

      <button
        className="delete-btn"
        onClick={() => deleteUser(user.id)}
      >
        Delete
      </button>

    </section>
  );
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
<section className="feed-outer-section">

  <input
    type="text"
    placeholder="Search users by name or role..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="search-input"
  />

</section>
      {/* USERS */}
      <section className="feed-outer-section">

        {filteredUsers.length === 0 && (
          <p>No users found.</p>
        )}

        {filteredUsers.map((user) => (
        <article key={user.id} className="action-block">

    <h3>{user.full_name}</h3>

    <p><strong>Role:</strong> {user.role}</p>
    <p><strong>Campus:</strong> {user.campus}</p>

    <p>
      <strong>Status:</strong>{" "}
      {user.is_banned ? "Suspended" : "Active"}
    </p>

    <UserActionButtons
      user={user}
      suspendUser={suspendUser}
      unbanUser={unbanUser}
      deleteUser={deleteUser}
    />

  </article>
        ))}

      </section>

    </main>
  );
}