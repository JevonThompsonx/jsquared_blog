import { useState, useEffect, FC } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase";
import ProfileAvatar from "./ProfileAvatar";
import AvatarPicker from "./AvatarPicker";
import Breadcrumbs from "./Breadcrumbs";
import { uploadAvatar, deleteOldAvatar } from "../utils/avatarUpload";

const AccountSettings: FC = () => {
  const navigate = useNavigate();
  const { user, updateProfile, refreshProfile } = useAuth();

  // Display name state
  const [displayName, setDisplayName] = useState(user?.username || "");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Refresh profile on mount to ensure we have latest data
  useEffect(() => {
    refreshProfile();
  }, []);

  // Update displayName when user changes (after refresh)
  useEffect(() => {
    if (user?.username !== undefined) {
      setDisplayName(user.username || "");
    }
  }, [user?.username]);

  // Avatar state
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);

  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleUpdateDisplayName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingName(true);
    setNameError(null);
    setNameSuccess(false);

    try {
      const trimmed = displayName.trim();
      console.log("Updating username to:", trimmed || "(empty - will clear)");

      // Pass trimmed string (even if empty) - AuthContext will convert empty to null
      await updateProfile({ username: trimmed });

      console.log("Username updated successfully");
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error updating username:", err);
      setNameError(err.message || "Failed to update display name");
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleAvatarUpload = async (file: File): Promise<string> => {
    // Delete old avatar if it's a custom upload
    if (user.avatar_url && user.avatar_url.startsWith("http")) {
      await deleteOldAvatar(user.avatar_url);
    }

    // Upload new avatar
    const url = await uploadAvatar(file, user.id);
    return url;
  };

  const handleAvatarSelect = async (avatarUrl: string) => {
    setIsUpdatingAvatar(true);
    try {
      // Only update if we have a valid avatar URL
      if (avatarUrl) {
        await updateProfile({ avatar_url: avatarUrl });
      }
    } catch (err: any) {
      console.error("Failed to update avatar:", err);
    } finally {
      setIsUpdatingAvatar(false);
      setShowAvatarPicker(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setIsUpdatingEmail(true);
    setEmailError(null);
    setEmailSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;

      setEmailSuccess(true);
      setNewEmail("");
      // Note: Supabase sends a confirmation email to the new address
    } catch (err: any) {
      setEmailError(err.message || "Failed to update email");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      // First verify current password by re-signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // Then update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8" style={{ background: "var(--background)" }}>
      <div className="container mx-auto max-w-2xl">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Settings" },
          ]}
        />

        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-8">Account Settings</h1>

        {/* Avatar Picker Modal */}
        {showAvatarPicker && (
          <AvatarPicker
            currentAvatar={user.avatar_url}
            username={user.username}
            email={user.email}
            onSelect={handleAvatarSelect}
            onUpload={handleAvatarUpload}
            onClose={() => setShowAvatarPicker(false)}
            isUploading={isUpdatingAvatar}
          />
        )}

        {/* Profile Section */}
        <div className="bg-[var(--card-bg)] shadow-xl rounded-lg border border-[var(--border)] p-6 mb-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Profile</h2>

          {/* Avatar */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative">
              <ProfileAvatar
                avatarUrl={user.avatar_url}
                username={user.username}
                email={user.email}
                size="lg"
              />
              <button
                type="button"
                onClick={() => setShowAvatarPicker(true)}
                className="absolute bottom-0 right-0 bg-[var(--primary)] text-white p-1.5 rounded-full shadow-lg hover:bg-[var(--primary-light)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                {user.username || user.email}
              </p>
              {user.username && (
                <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
              )}
            </div>
          </div>

          {/* Display Name Form */}
          <form onSubmit={handleUpdateDisplayName}>
            <label htmlFor="displayName" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Display Name
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name (optional)"
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                maxLength={50}
              />
              <button
                type="submit"
                disabled={isUpdatingName}
                className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isUpdatingName ? "Saving..." : "Save"}
              </button>
            </div>
            {nameError && <p className="mt-2 text-sm text-red-500">{nameError}</p>}
            {nameSuccess && <p className="mt-2 text-sm text-green-500">Display name updated!</p>}
          </form>
        </div>

        {/* Email Section */}
        <div className="bg-[var(--card-bg)] shadow-xl rounded-lg border border-[var(--border)] p-6 mb-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Email</h2>

          <div className="mb-4">
            <p className="text-sm text-[var(--text-secondary)]">Current email</p>
            <p className="font-medium text-[var(--text-primary)]">{user.email}</p>
          </div>

          <form onSubmit={handleUpdateEmail}>
            <label htmlFor="newEmail" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              New Email
            </label>
            <div className="flex gap-3">
              <input
                type="email"
                id="newEmail"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email"
                className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
              <button
                type="submit"
                disabled={isUpdatingEmail || !newEmail.trim()}
                className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isUpdatingEmail ? "Updating..." : "Update"}
              </button>
            </div>
            {emailError && <p className="mt-2 text-sm text-red-500">{emailError}</p>}
            {emailSuccess && (
              <p className="mt-2 text-sm text-green-500">
                Verification email sent! Please check your inbox.
              </p>
            )}
          </form>
        </div>

        {/* Password Section */}
        <div className="bg-[var(--card-bg)] shadow-xl rounded-lg border border-[var(--border)] p-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">Password</h2>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 characters)"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </button>

            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-green-500">Password updated successfully!</p>}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
