import React, { useEffect, useState } from 'react';
import sendData from './util/sendData';
import './stylesheets/Admin.css';

function Admin() {
    const [users, setUsers] = useState([]);
    const [deletedUsers, setDeletedUsers] = useState([]);
    const [showDeleted, setShowDeleted] = useState(false);
    const [deletedLoaded, setDeletedLoaded] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [username, setUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    async function loadUsers() {
        setLoading(true);
        setError('');
        try {
            const response = await sendData('/admin/load', {});
            if (response?.status !== 'success') {
                setError(response?.message || 'Unable to load users.');
                return;
            }
            setUsers(response.users);
        } catch (err) {
            console.error(err);
            setError('Unable to connect to the server.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    async function toggleDeletedUsers() {
        const nextShowDeleted = !showDeleted;
        setShowDeleted(nextShowDeleted);
        setOpenMenuId(null);
        setNotice('');
        if (nextShowDeleted && !deletedLoaded) {
            try {
                const response = await sendData('/admin/deletedusers', {});
                if (response?.status !== 'success') {
                    setError(response?.message || 'Unable to load deleted users.');
                    return;
                }
                setDeletedUsers(response.users);
                setDeletedLoaded(true);
                setError('');
            } catch (err) {
                console.error(err);
                setError('Unable to connect to the server.');
            }
        } else {
            setError('');
        }
    }

    function openEditor(user) {
        setSelectedUser(user);
        setUsername(user.username);
        setNewPassword('');
        setOpenMenuId(null);
    }

    async function saveUser(event) {
        event.preventDefault();
        if (!selectedUser || saving) return;
        setSaving(true);
        setError('');
        try {
            const response = await sendData('/admin/edituser', {
                userId: selectedUser.id,
                username,
                newPassword,
            });
            if (response?.status !== 'success') {
                setError(response?.message || 'Unable to update user.');
                return;
            }
            setSelectedUser(null);
            setNotice('User updated.');
            await loadUsers();
        } catch (err) {
            console.error(err);
            setError('Unable to connect to the server.');
        } finally {
            setSaving(false);
        }
    }

    async function deleteUser(user) {
        if (!window.confirm(`Move ${user.username} to deleted accounts?`)) return;
        setOpenMenuId(null);
        setError('');
        try {
            const response = await sendData('/admin/deleteuser', {userId: user.id});
            if (response?.status !== 'success') {
                setError(response?.message || 'Unable to delete user.');
                return;
            }
            setSelectedUser(null);
            setNotice(`${user.username} moved to deleted accounts.`);
            await loadUsers();
            setDeletedLoaded(false);
        } catch (err) {
            console.error(err);
            setError('Unable to connect to the server.');
        }
    }

    async function restoreUser(user, replacementUsername) {
        const response = await sendData('/admin/restoreuser', {
            userId: user.id,
            username: replacementUsername,
        });
        if (response?.code === 'USERNAME_TAKEN') {
            const suggestedUsername = window.prompt(
                `${user.username} is already in use. Enter a new username to restore this account:`,
                user.username
            );
            if (suggestedUsername === null) return;
            const retry = await sendData('/admin/restoreuser', {
                userId: user.id,
                username: suggestedUsername,
            });
            if (retry?.status !== 'success') {
                setError(retry?.message || 'Unable to restore user.');
                return;
            }
        } else if (response?.status !== 'success') {
            setError(response?.message || 'Unable to restore user.');
            return;
        }
        setDeletedUsers((current) => current.filter((entry) => entry.id !== user.id));
        setDeletedLoaded(true);
        setNotice(`${user.username} restored.`);
        await loadUsers();
    }

    async function permanentlyDeleteUser(user) {
        const firstConfirmation = window.confirm(
            `Permanently delete ${user.username}? This cannot be undone.`
        );
        if (!firstConfirmation) return;
        const secondConfirmation = window.confirm(
            `Final confirmation: permanently delete ${user.username} and all of their account data?`
        );
        if (!secondConfirmation) return;

        setError('');
        try {
            const response = await sendData('/admin/permanentlydeleteuser', {userId: user.id});
            if (response?.status !== 'success') {
                setError(response?.message || 'Unable to permanently delete user.');
                return;
            }
            setDeletedUsers((current) => current.filter((entry) => entry.id !== user.id));
            setNotice(`${user.username} permanently deleted.`);
        } catch (err) {
            console.error(err);
            setError('Unable to connect to the server.');
        }
    }

    return (
        <main className="Admin">
            <header className="adminHeader">
                <a className="adminLogo" href="/dashboard">Keypass Guard</a>
                <button className="adminViewToggle" onClick={toggleDeletedUsers}>
                    {showDeleted ? 'Active users' : 'Deleted accounts'}
                </button>
            </header>

            <section className="adminContent">
                <h1>{showDeleted ? 'Deleted accounts' : 'User accounts'}</h1>
                <p className="adminSubheading">
                    {showDeleted
                        ? 'Restore accounts or permanently remove them.'
                        : `${users.length} active account${users.length === 1 ? '' : 's'}`}
                </p>

                {error && <div className="adminMessage error" role="alert">{error}</div>}
                {notice && <div className="adminMessage success" role="status">{notice}</div>}

                {loading && !showDeleted ? (
                    <p className="adminEmpty">Loading users...</p>
                ) : showDeleted && !deletedLoaded && !error ? (
                    <p className="adminEmpty">Loading deleted accounts...</p>
                ) : (
                    <div className="adminUserList">
                        {(showDeleted ? deletedUsers : users).map((user, index) => (
                            <article className="adminUserRow" key={user.id}>
                                <span className="adminUserIndex">{index + 1}</span>
                                <strong className="adminUsername">{user.username || 'Unnamed user'}</strong>
                                <span className="adminSiteCount">
                                    {user.sitesCount} site{user.sitesCount === 1 ? '' : 's'}
                                </span>
                                {showDeleted ? (
                                    <div className="adminDeletedActions">
                                        <button onClick={() => restoreUser(user)}>Restore</button>
                                        <button
                                            className="danger"
                                            onClick={() => permanentlyDeleteUser(user)}
                                        >
                                            Permanently delete
                                        </button>
                                    </div>
                                ) : (
                                    <div className="adminMenuWrap">
                                        <button
                                            className="adminMenuButton"
                                            aria-label={`Actions for ${user.username}`}
                                            aria-expanded={openMenuId === user.id}
                                            onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                        >
                                            &#8942;
                                        </button>
                                        {openMenuId === user.id && (
                                            <div className="adminActionMenu">
                                                <button onClick={() => openEditor(user)}>Edit user</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </article>
                        ))}
                        {!loading && (showDeleted ? deletedUsers : users).length === 0 && (
                            <p className="adminEmpty">
                                {showDeleted ? 'No deleted accounts.' : 'No users found.'}
                            </p>
                        )}
                    </div>
                )}
            </section>

            {selectedUser && (
                <div className="adminModalBackdrop" onClick={() => setSelectedUser(null)}>
                    <form
                        className="adminEditModal"
                        onSubmit={saveUser}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2>Edit {selectedUser.username}</h2>
                        <label>
                            Username
                            <input
                                value={username}
                                onChange={(event) => setUsername(event.target.value)}
                                autoComplete="off"
                                required
                            />
                        </label>
                        <label>
                            New password
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                autoComplete="new-password"
                                placeholder="Leave blank to keep current password"
                                minLength={8}
                            />
                        </label>
                        <p>{selectedUser.sitesCount} saved site{selectedUser.sitesCount === 1 ? '' : 's'}</p>
                        <div className="adminModalActions">
                            <button
                                type="button"
                                className="danger"
                                onClick={() => deleteUser(selectedUser)}
                            >
                                Move to deleted accounts
                            </button>
                            <button type="button" className="secondary" onClick={() => setSelectedUser(null)}>
                                Cancel
                            </button>
                            <button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </main>
    );
}

export default Admin;
