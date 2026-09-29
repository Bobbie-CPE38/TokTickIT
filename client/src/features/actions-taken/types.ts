export interface ActionPerformer {
  id: number;
  name: string;
  email: string;
  role?: string;
}

export interface ActionTaken {
  id: number;
  ticketId: number;
  actionDateTime: string;
  description: string;
  result: string;
  performedByUserId: number;
  performedBy?: ActionPerformer;
  performer?: ActionPerformer;
  isFollowUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateActionTakenPayload {
  actionDateTime?: string;
  description: string;
  result: string;
  isFollowUpRequired: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}

export interface UpdateActionTakenPayload {
  actionDateTime?: string;
  description?: string;
  result?: string;
  isFollowUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}
