import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '@/App';

/**
 * Hook for module-based access control.
 * Supports "Preview as Role" mode via sessionStorage.
 *
 * Returns: { permissions, loading, hasAccess, getPermission, refresh, previewRole }
 */
export function useAccessControl() {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewRole, setPreviewRole] = useState(() => sessionStorage.getItem('access_preview_role'));

  const fetchPermissions = useCallback(async () => {
    const token = localStorage.getItem('capex_token');
    if (!token) { setLoading(false); return; }

    const preview = sessionStorage.getItem('access_preview_role');
    setPreviewRole(preview);

    try {
      const url = preview
        ? `${API}/admin/access-config/preview/${preview}`
        : `${API}/access/permissions`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPermissions(res.data);
    } catch {
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

  // Listen for preview mode changes (custom event dispatched when toggling preview)
  useEffect(() => {
    const handler = () => fetchPermissions();
    window.addEventListener('previewModeChanged', handler);
    return () => window.removeEventListener('previewModeChanged', handler);
  }, [fetchPermissions]);

  const hasAccess = useCallback((module, itemId) => {
    if (!permissions) return true;
    const modulePerm = permissions?.[module];
    if (!modulePerm) return true;
    const perm = modulePerm[itemId];
    if (perm === undefined) return true;
    return perm !== 'hidden';
  }, [permissions]);

  const getPermission = useCallback((module, itemId) => {
    if (!permissions) return 'view';
    return permissions?.[module]?.[itemId] || 'view';
  }, [permissions]);

  return { permissions, loading, hasAccess, getPermission, refresh: fetchPermissions, previewRole };
}
