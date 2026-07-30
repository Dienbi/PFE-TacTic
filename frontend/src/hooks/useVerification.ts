import { useState, useCallback } from 'react';
import {
  getPendingSocialStatusForHR,
  getPendingChildrenForHR,
  verifySocialStatus,
  rejectSocialStatus,
  verifyChild,
  rejectChild,
  SocialStatusProof,
  Child,
} from '../api/familyInfo';

export const usePendingChanges = (employeeId?: number) => {
  const [socialStatusChanges, setSocialStatusChanges] = useState<SocialStatusProof[]>([]);
  const [childrenChanges, setChildrenChanges] = useState<Child[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPendingChanges = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [socialStatus, children] = await Promise.all([
        getPendingSocialStatusForHR(),
        getPendingChildrenForHR(),
      ]);

      let filteredSocialStatus = socialStatus;
      let filteredChildren = children;

      if (employeeId) {
        filteredSocialStatus = socialStatus.filter(s => s.utilisateur_id === employeeId);
        filteredChildren = children.filter(c => c.utilisateur_id === employeeId);
      }

      setSocialStatusChanges(filteredSocialStatus);
      setChildrenChanges(filteredChildren);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending changes');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  return {
    socialStatusChanges,
    childrenChanges,
    loading,
    error,
    loadPendingChanges,
  };
};

export const useVerificationActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifySocialStatusChange = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await verifySocialStatus(id);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify social status');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectSocialStatusChange = useCallback(async (id: number, reason: string) => {
    setLoading(true);
    setError(null);
    try {
      await rejectSocialStatus(id, reason);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject social status');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyChildChange = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await verifyChild(id);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify child');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectChildChange = useCallback(async (id: number, reason: string) => {
    setLoading(true);
    setError(null);
    try {
      await rejectChild(id, reason);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reject child');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    verifySocialStatusChange,
    rejectSocialStatusChange,
    verifyChildChange,
    rejectChildChange,
  };
};
