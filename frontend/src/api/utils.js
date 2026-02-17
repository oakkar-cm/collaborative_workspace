/**
 * Normalize workspace from API so UI can use a consistent shape.
 * Backend may return Mongoose doc (_id, createdAt) or other (workspace_id, created_at).
 */
export function getWorkspaceId(workspace) {
  return workspace.workspace_id ?? workspace._id ?? workspace.id;
}

export function getWorkspaceCreatedAt(workspace) {
  return workspace.created_at ?? workspace.createdAt;
}
