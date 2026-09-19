import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../../context/AuthContext.js";
import {
  AdminUser,
  Role,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetUserInitialPassword,
} from "../../api.js";
import { EyeToggleIcon } from "../../components/common/EyeToggleIcon.js";

export const UserManagementScreen: React.FC = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tableError, setTableError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Drawer / Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  // Form State
  const [fullName, setFullName] = useState<string>("");
  const [emailAddress, setEmailAddress] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<Role>("REQUESTER");
  const [isActiveStatus, setIsActiveStatus] = useState<boolean>(true);
  const [initialPassword, setInitialPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Reset Password Mode in Edit Drawer
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState<boolean>(false);
  const [newResetPassword, setNewResetPassword] = useState<string>("");
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);

  // Drawer Action State
  const [drawerSubmitting, setDrawerSubmitting] = useState<boolean>(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [drawerSuccess, setDrawerSuccess] = useState<string | null>(null);

  // Load users from API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setTableError(null);
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } catch (err: any) {
      setTableError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Client-side filtering for fast interactive feedback
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        !searchQuery.trim() ||
        u.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.trim().toLowerCase());

      const matchesRole =
        roleFilter === "ALL" || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Safety Guards calculations
  const activeAdminCount = useMemo(() => {
    return users.filter((u) => u.role === "ADMINISTRATOR" && u.isActive).length;
  }, [users]);

  const isEditingOwnAccount = Boolean(
    drawerMode === "edit" &&
      selectedUser &&
      currentUser &&
      selectedUser.id === currentUser.id
  );

  const isEditingLastActiveAdmin = Boolean(
    drawerMode === "edit" &&
      selectedUser &&
      selectedUser.role === "ADMINISTRATOR" &&
      selectedUser.isActive &&
      activeAdminCount <= 1
  );

  const deactivateTooltip = isEditingOwnAccount
    ? "You cannot deactivate your own account"
    : isEditingLastActiveAdmin
    ? "System requires at least one active Administrator."
    : "";

  const isDeactivateDisabled =
    isEditingOwnAccount || isEditingLastActiveAdmin || !isActiveStatus;

  // Open Create User Drawer
  const handleOpenCreate = () => {
    setDrawerMode("create");
    setSelectedUser(null);
    setFullName("");
    setEmailAddress("");
    setSelectedRole("REQUESTER");
    setIsActiveStatus(true);
    setInitialPassword("");
    setShowPassword(false);
    setIsResetPasswordOpen(false);
    setNewResetPassword("");
    setDrawerError(null);
    setDrawerSuccess(null);
    setIsDrawerOpen(true);
  };

  // Open Edit User Drawer
  const handleOpenEdit = (userToEdit: AdminUser) => {
    setDrawerMode("edit");
    setSelectedUser(userToEdit);
    setFullName(userToEdit.name);
    setEmailAddress(userToEdit.email);
    setSelectedRole(userToEdit.role);
    setIsActiveStatus(userToEdit.isActive);
    setInitialPassword("");
    setShowPassword(false);
    setIsResetPasswordOpen(false);
    setNewResetPassword("");
    setResetPasswordSuccess(null);
    setResetPasswordError(null);
    setDrawerError(null);
    setDrawerSuccess(null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedUser(null);
    setDrawerError(null);
    setDrawerSuccess(null);
  };

  // Handle Form Submission (Create or Edit)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setDrawerError(null);
    setDrawerSuccess(null);

    // Basic client validations
    if (!fullName.trim()) {
      setDrawerError("Full Name is required.");
      return;
    }
    if (!emailAddress.trim()) {
      setDrawerError("Email Address is required.");
      return;
    }

    if (drawerMode === "create" && !initialPassword) {
      setDrawerError("Initial Password is required.");
      return;
    }

    setDrawerSubmitting(true);

    try {
      if (drawerMode === "create") {
        const created = await createAdminUser({
          name: fullName.trim(),
          email: emailAddress.trim(),
          role: selectedRole,
          isActive: isActiveStatus,
          initialPassword,
        });
        setUsers((prev) => [...prev, created]);
        setIsDrawerOpen(false);
      } else if (drawerMode === "edit" && selectedUser) {
        const updated = await updateAdminUser(selectedUser.id, {
          name: fullName.trim(),
          email: emailAddress.trim(),
          role: selectedRole,
          isActive: isActiveStatus,
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === selectedUser.id ? updated : u))
        );
        setIsDrawerOpen(false);
      }
    } catch (err: any) {
      // BR-20: Form state is preserved on failure
      setDrawerError(err.message || "Operation failed. Please check your inputs.");
    } finally {
      setDrawerSubmitting(false);
    }
  };

  // Handle Direct Deactivation from Drawer
  const handleDeactivate = async () => {
    if (!selectedUser || isDeactivateDisabled) return;
    setDrawerError(null);
    setDrawerSuccess(null);
    setDrawerSubmitting(true);

    try {
      const updated = await updateAdminUser(selectedUser.id, {
        isActive: false,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? updated : u))
      );
      setIsActiveStatus(false);
      setIsDrawerOpen(false);
    } catch (err: any) {
      setDrawerError(err.message || "Failed to deactivate user.");
    } finally {
      setDrawerSubmitting(false);
    }
  };

  // Handle Direct Reactivation from Drawer
  const handleReactivate = async () => {
    if (!selectedUser) return;
    setDrawerError(null);
    setDrawerSuccess(null);
    setDrawerSubmitting(true);

    try {
      const updated = await updateAdminUser(selectedUser.id, {
        isActive: true,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? updated : u))
      );
      setIsActiveStatus(true);
      setIsDrawerOpen(false);
    } catch (err: any) {
      setDrawerError(err.message || "Failed to reactivate user.");
    } finally {
      setDrawerSubmitting(false);
    }
  };

  // Handle Reset Initial Password in Edit Drawer
  const handleResetPasswordSubmit = async () => {
    if (!selectedUser) return;
    setResetPasswordError(null);
    setResetPasswordSuccess(null);

    if (!newResetPassword) {
      setResetPasswordError("New initial password is required.");
      return;
    }

    try {
      await resetUserInitialPassword(selectedUser.id, newResetPassword);
      setResetPasswordSuccess(
        "Initial password reset successfully. User must change password on next login."
      );
      setNewResetPassword("");
      // Update local state mustChangePassword
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id ? { ...u, mustChangePassword: true } : u
        )
      );
    } catch (err: any) {
      setResetPasswordError(err.message || "Failed to reset password.");
    }
  };

  // Role Badge Renderer per Zen Green UI Spec Section 2.2
  const renderRoleBadge = (role: Role) => {
    switch (role) {
      case "REQUESTER":
        return (
          <span
            className="badge rounded-pill fw-semibold px-2.5 py-1"
            style={{
              backgroundColor: "#DBEAFE",
              color: "#1E40AF",
              border: "1px solid #93C5FD",
              fontSize: "0.75rem",
            }}
          >
            Requester
          </span>
        );
      case "IT_STAFF":
        return (
          <span
            className="badge rounded-pill fw-semibold px-2.5 py-1"
            style={{
              backgroundColor: "#EAF6EF",
              color: "#0B7A46",
              border: "1px solid #A7F3D0",
              fontSize: "0.75rem",
            }}
          >
            IT Staff
          </span>
        );
      case "ADMINISTRATOR":
        return (
          <span
            className="badge rounded-pill fw-semibold px-2.5 py-1"
            style={{
              backgroundColor: "#EDE9FE",
              color: "#6D28D9",
              border: "1px solid #DDD6FE",
              fontSize: "0.75rem",
            }}
          >
            Administrator
          </span>
        );
    }
  };

  // Status Badge Renderer per Zen Green UI Spec Section 2.2
  const renderStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span
          className="badge rounded-pill fw-semibold px-2.5 py-1"
          style={{
            backgroundColor: "#D1FAE5",
            color: "#059669",
            border: "1px solid #6EE7B7",
            fontSize: "0.75rem",
          }}
        >
          Active
        </span>
      );
    }
    return (
      <span
        className="badge rounded-pill fw-semibold px-2.5 py-1"
        style={{
          backgroundColor: "#FEE2E2",
          color: "#DC2626",
          border: "1px solid #FCA5A5",
          fontSize: "0.75rem",
        }}
      >
        Inactive
      </span>
    );
  };

  return (
    <div className="container py-4" style={{ maxWidth: "1200px" }}>
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h1 className="h4 fw-bold mb-1" style={{ color: "#1C2D27" }}>
            Users
          </h1>
          <p className="text-muted small mb-0">
            Manage user accounts, roles, and administrative access controls.
          </p>
        </div>
        <button
          type="button"
          className="btn text-white fw-medium d-flex align-items-center gap-1.5 shadow-sm"
          style={{ backgroundColor: "#006B3C", borderRadius: "6px", height: "38px" }}
          onClick={handleOpenCreate}
        >
          <span>+ Create User</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="card border shadow-sm p-3 mb-4 bg-white" style={{ borderColor: "#E2E8F0" }}>
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-8">
            <div className="input-group">
              <span className="input-group-text bg-light text-muted border-end-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: "0.875rem" }}
              />
            </div>
          </div>
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2">
              <label htmlFor="roleFilterSelect" className="text-nowrap small text-muted fw-medium">
                Filter by Role:
              </label>
              <select
                id="roleFilterSelect"
                aria-label="Filter by role"
                className="form-select form-select-sm"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ fontSize: "0.875rem" }}
              >
                <option value="ALL">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {tableError && (
        <div className="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <span>{tableError}</span>
        </div>
      )}

      {/* User Directory Table (Desktop/Tablet) */}
      <div className="card border shadow-sm bg-white overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
        {loading ? (
          <div className="p-5 text-center">
            <div className="spinner-border" style={{ color: "#006B3C" }} role="status">
              <span className="visually-hidden">Loading users...</span>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-5 text-center">
            <p className="text-muted mb-2">No users found matching your search or filters.</p>
            {(searchQuery || roleFilter !== "ALL") && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary mt-2"
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("ALL");
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop / Tablet User Directory Table (≥ 768px) */}
            <div className="table-responsive d-none d-md-block">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.875rem" }}>
                <thead style={{ backgroundColor: "#F8FAFC", color: "#52665D" }}>
                  <tr>
                    <th scope="col" className="ps-4 py-3 fw-semibold">
                      Name
                    </th>
                    <th scope="col" className="py-3 fw-semibold">
                      Email
                    </th>
                    <th scope="col" className="py-3 fw-semibold">
                      Role
                    </th>
                    <th scope="col" className="py-3 fw-semibold">
                      Status
                    </th>
                    <th scope="col" className="pe-4 py-3 text-end fw-semibold">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="ps-4 py-3 fw-medium" style={{ color: "#1C2D27" }}>
                        {u.name}
                      </td>
                      <td className="py-3 text-muted">{u.email}</td>
                      <td className="py-3">{renderRoleBadge(u.role)}</td>
                      <td className="py-3">{renderStatusBadge(u.isActive)}</td>
                      <td className="pe-4 py-3 text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          style={{ borderRadius: "4px", minWidth: "60px" }}
                          onClick={() => handleOpenEdit(u)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked User Cards (< 768px) */}
            <div className="d-md-none p-3 d-flex flex-column gap-3" data-testid="admin-user-cards-container">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  data-testid="admin-user-card"
                  className="card border rounded-3 p-3 shadow-none bg-white"
                  style={{ borderColor: "#E2E8F0" }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span className="fw-semibold fs-6" style={{ color: "#1C2D27" }}>
                      {u.name}
                    </span>
                    {renderStatusBadge(u.isActive)}
                  </div>
                  <div className="text-muted small mb-2">{u.email}</div>
                  <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                    <div>{renderRoleBadge(u.role)}</div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-center"
                      style={{ minHeight: "44px", minWidth: "80px", borderRadius: "6px" }}
                      onClick={() => handleOpenEdit(u)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Side-Drawer / Modal Overlay for Create & Edit */}
      {isDrawerOpen && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.4)", zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="modal-dialog modal-dialog-scrollable"
            style={{ maxWidth: "520px", margin: "1.75rem auto" }}
          >
            <div
              className="modal-content border-0 shadow-lg"
              style={{ borderRadius: "8px", maxHeight: "calc(100vh - 3.5rem)", display: "flex", flexDirection: "column" }}
            >
              {/* Drawer Header */}
              <div
                className="modal-header py-3 px-4 flex-shrink-0"
                style={{ backgroundColor: "#EAF6EF", borderBottom: "1px solid #C2E2D3" }}
              >
                <h2 className="modal-title h5 fw-bold" style={{ color: "#006B3C" }}>
                  {drawerMode === "create" ? "Create New User" : "Edit User"}
                </h2>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={handleCloseDrawer}
                />
              </div>

              {/* Drawer Body Form */}
              <form
                onSubmit={handleSaveUser}
                style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", overflow: "hidden" }}
              >
                <div className="modal-body p-4" style={{ fontSize: "0.875rem", overflowY: "auto" }}>
                  {/* Feedback Alerts */}
                  {drawerError && (
                    <div
                      className="alert p-2.5 mb-3 d-flex align-items-center"
                      style={{
                        backgroundColor: "#FEE2E2",
                        color: "#991B1B",
                        border: "1px solid #EF4444",
                        borderRadius: "6px",
                      }}
                      role="alert"
                    >
                      <span>{drawerError}</span>
                    </div>
                  )}
                  {drawerSuccess && (
                    <div
                      className="alert p-2.5 mb-3 d-flex align-items-center"
                      style={{
                        backgroundColor: "#D1FAE5",
                        color: "#065F46",
                        border: "1px solid #6EE7B7",
                        borderRadius: "6px",
                      }}
                      role="alert"
                    >
                      <span>{drawerSuccess}</span>
                    </div>
                  )}

                  {/* Full Name */}
                  <div className="mb-3">
                    <label htmlFor="userFullName" className="form-label fw-semibold text-dark mb-1">
                      Full Name <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      id="userFullName"
                      aria-label="Full Name"
                      type="text"
                      className="form-control"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Thompson"
                      required
                    />
                  </div>

                  {/* Email Address */}
                  <div className="mb-3">
                    <label htmlFor="userEmailAddress" className="form-label fw-semibold text-dark mb-1">
                      Email Address <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      id="userEmailAddress"
                      aria-label="Email Address"
                      type="email"
                      className="form-control"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="e.g. alex.thompson@toktickit.com"
                      required
                    />
                  </div>

                  {/* Role */}
                  <div className="mb-3">
                    <label htmlFor="userRole" className="form-label fw-semibold text-dark mb-1">
                      Role <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <select
                      id="userRole"
                      aria-label="Role"
                      className="form-select"
                      value={selectedRole}
                      disabled={isEditingLastActiveAdmin || isEditingOwnAccount}
                      title={
                        isEditingLastActiveAdmin
                          ? "System requires at least one active Administrator."
                          : isEditingOwnAccount
                          ? "You cannot change your own role away from Administrator."
                          : undefined
                      }
                      onChange={(e) => setSelectedRole(e.target.value as Role)}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                    {(isEditingLastActiveAdmin || isEditingOwnAccount) && (
                      <div className="form-text small text-muted">
                        Role change locked to preserve administrative access.
                      </div>
                    )}
                  </div>

                  {/* Account Status Badge (Edit Mode Only - replaces redundant radio buttons) */}
                  {drawerMode === "edit" && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold text-dark mb-1 d-block">
                        Account Status
                      </label>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        {isActiveStatus ? (
                          <span
                            className="badge fw-medium px-2 py-1"
                            style={{
                              backgroundColor: "#EAF6EF",
                              color: "#006B3C",
                              border: "1px solid #C2E2D3",
                              fontSize: "0.8rem",
                            }}
                          >
                            Active
                          </span>
                        ) : (
                          <span
                            className="badge fw-medium px-2 py-1"
                            style={{
                              backgroundColor: "#FEE2E2",
                              color: "#DC2626",
                              border: "1px solid #FCA5A5",
                              fontSize: "0.8rem",
                            }}
                          >
                            Inactive
                          </span>
                        )}
                      </div>
                      {isEditingOwnAccount && (
                        <div className="form-text small text-danger mt-1">
                          You cannot deactivate your own account.
                        </div>
                      )}
                      {isEditingLastActiveAdmin && !isEditingOwnAccount && (
                        <div className="form-text small text-danger mt-1">
                          System requires at least one active Administrator.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Initial Password (Create Mode Only) */}
                  {drawerMode === "create" && (
                    <div className="mb-3">
                      <label htmlFor="userInitialPassword" className="form-label fw-semibold text-dark mb-1">
                        Initial Password <span style={{ color: "#DC2626" }}>*</span>
                      </label>
                      <div className="position-relative">
                        <input
                          id="userInitialPassword"
                          aria-label="Initial Password"
                          type={showPassword ? "text" : "password"}
                          className="form-control pe-5"
                          value={initialPassword}
                          onChange={(e) => setInitialPassword(e.target.value)}
                          placeholder="Min 8 chars with upper, lower, num & symbol"
                          required
                          style={{ borderColor: "#D1D5DB" }}
                        />
                        <button
                          type="button"
                          className="btn p-0 position-absolute end-0 top-0 bottom-0 d-flex align-items-center justify-content-center text-muted border-0 bg-transparent"
                          style={{ width: "38px", color: "#52665D" }}
                          onClick={() => setShowPassword((prev) => !prev)}
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          <EyeToggleIcon isVisible={showPassword} />
                        </button>
                      </div>
                      <div className="form-check mt-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="mustChangeCheckbox"
                          checked
                          disabled
                        />
                        <label className="form-check-label small text-muted" htmlFor="mustChangeCheckbox">
                          User must change password on first login
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Reset Password Option (Edit Mode Only) */}
                  {drawerMode === "edit" && selectedUser && (
                    <div className="border-top pt-3 mt-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-semibold text-dark">Password Management</span>
                        <button
                          type="button"
                          className="btn btn-sm btn-link text-decoration-none p-0"
                          style={{ color: "#006B3C" }}
                          onClick={() => {
                            setIsResetPasswordOpen((prev) => !prev);
                            setResetPasswordError(null);
                            setResetPasswordSuccess(null);
                          }}
                        >
                          {isResetPasswordOpen ? "Cancel Reset" : "Reset Initial Password"}
                        </button>
                      </div>

                      {isResetPasswordOpen && (
                        <div className="p-3 bg-light rounded border mb-2">
                          <label
                            htmlFor="resetPasswordField"
                            className="form-label small fw-semibold text-dark mb-1"
                          >
                            New Initial Password
                          </label>
                          <div className="position-relative mb-2">
                            <input
                              id="resetPasswordField"
                              type={showResetPassword ? "text" : "password"}
                              className="form-control form-control-sm pe-5"
                              value={newResetPassword}
                              onChange={(e) => setNewResetPassword(e.target.value)}
                              placeholder="New temporary password"
                              style={{ borderColor: "#D1D5DB" }}
                            />
                            <button
                              type="button"
                              className="btn p-0 position-absolute end-0 top-0 bottom-0 d-flex align-items-center justify-content-center text-muted border-0 bg-transparent"
                              style={{ width: "34px", color: "#52665D" }}
                              onClick={() => setShowResetPassword((prev) => !prev)}
                              tabIndex={-1}
                              aria-label={showResetPassword ? "Hide password" : "Show password"}
                            >
                              <EyeToggleIcon isVisible={showResetPassword} />
                            </button>
                          </div>
                          {resetPasswordError && (
                            <div className="small text-danger mb-2">{resetPasswordError}</div>
                          )}
                          {resetPasswordSuccess && (
                            <div className="small text-success mb-2">{resetPasswordSuccess}</div>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm text-white"
                            style={{ backgroundColor: "#006B3C" }}
                            onClick={handleResetPasswordSubmit}
                          >
                            Set Initial Password
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Drawer Footer Actions */}
                <div className="modal-footer d-flex flex-column gap-2 px-4 pb-4 border-0 flex-shrink-0">
                  <button
                    type="submit"
                    className="btn text-white w-100 fw-medium shadow-sm"
                    style={{ backgroundColor: "#006B3C", height: "40px" }}
                    disabled={drawerSubmitting}
                  >
                    {drawerSubmitting ? "Saving..." : "Save User"}
                  </button>

                  {drawerMode === "edit" && isActiveStatus && (
                    <span
                      className="w-100 d-inline-block"
                      title={deactivateTooltip}
                      tabIndex={isDeactivateDisabled ? 0 : undefined}
                    >
                      <button
                        type="button"
                        className="btn w-100 fw-medium"
                        style={{
                          height: "40px",
                          borderColor: isDeactivateDisabled ? "#D1D5DB" : "#EF4444",
                          color: isDeactivateDisabled ? "#9CA3AF" : "#DC2626",
                          backgroundColor: isDeactivateDisabled ? "#E5E7EB" : "#FFFFFF",
                          cursor: isDeactivateDisabled ? "not-allowed" : "pointer",
                        }}
                        disabled={isDeactivateDisabled || drawerSubmitting}
                        onClick={handleDeactivate}
                      >
                        Deactivate User
                      </button>
                    </span>
                  )}

                  {drawerMode === "edit" && !isActiveStatus && (
                    <button
                      type="button"
                      className="btn w-100 fw-medium"
                      style={{
                        height: "40px",
                        borderColor: "#006B3C",
                        color: "#006B3C",
                        backgroundColor: "#FFFFFF",
                        cursor: "pointer",
                      }}
                      disabled={drawerSubmitting}
                      onClick={handleReactivate}
                    >
                      Reactivate User
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-link text-muted w-100 p-0 mt-1"
                    style={{ cursor: "pointer" }}
                    onClick={handleCloseDrawer}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementScreen;
