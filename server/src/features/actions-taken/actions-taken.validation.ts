import { UnprocessableEntityError, BadRequestError } from "../../core/errors.js";

export interface CreateActionTakenInput {
  actionDateTime?: string | Date;
  description: string;
  result: string;
  isFollowUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}

export interface UpdateActionTakenInput {
  actionDateTime?: string | Date;
  description?: string;
  result?: string;
  isFollowUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
}

/**
 * Validates and sanitizes followUpNote according to BR-05 (UNIT-02).
 * - If isFollowUpRequired is true: mandatory, 3 to 1,000 characters after whitespace trimming.
 * - If isFollowUpRequired is false: coerced to null.
 */
export function validateFollowUpNote(
  isFollowUpRequired: boolean,
  followUpNote?: string | null
): string | null {
  if (!isFollowUpRequired) {
    return null;
  }

  if (typeof followUpNote !== "string") {
    throw new UnprocessableEntityError(
      "Validation Error: followUpNote is required when follow-up is flagged (minimum 3 characters)."
    );
  }

  const trimmed = followUpNote.trim();
  if (trimmed.length < 3) {
    throw new UnprocessableEntityError(
      "Validation Error: followUpNote must be at least 3 characters in length when follow-up is required."
    );
  }

  if (trimmed.length > 1000) {
    throw new UnprocessableEntityError(
      "Validation Error: followUpNote must not exceed 1,000 characters in length."
    );
  }

  return trimmed;
}

/**
 * Validates an actionDateTime timestamp.
 * - Defaults to current server timestamp if omitted.
 * - Rejects timestamps more than 24 hours in the future.
 */
export function validateActionDateTime(actionDateTime?: string | Date): Date {
  if (!actionDateTime) {
    return new Date();
  }

  const parsed = new Date(actionDateTime);
  if (isNaN(parsed.getTime())) {
    throw new BadRequestError("Invalid actionDateTime provided. Must be a valid ISO 8601 timestamp.");
  }

  const maxAllowedFuture = Date.now() + 24 * 60 * 60 * 1000;
  if (parsed.getTime() > maxAllowedFuture) {
    throw new UnprocessableEntityError(
      "Validation Error: actionDateTime cannot be set more than 24 hours into the future."
    );
  }

  return parsed;
}

/**
 * Validates payload for creating a new ActionTaken (BR-05, BR-06).
 */
export function validateCreateActionTaken(data: any): {
  actionDateTime: Date;
  description: string;
  result: string;
  isFollowUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
} {
  if (!data || typeof data !== "object") {
    throw new BadRequestError("Request body must be a JSON object.");
  }

  if (typeof data.description !== "string" || data.description.trim().length < 3) {
    throw new UnprocessableEntityError(
      "Validation Error: description is required and must be at least 3 characters in length."
    );
  }
  if (data.description.trim().length > 2000) {
    throw new UnprocessableEntityError(
      "Validation Error: description must not exceed 2,000 characters in length."
    );
  }

  if (typeof data.result !== "string" || data.result.trim().length < 3) {
    throw new UnprocessableEntityError(
      "Validation Error: result is required and must be at least 3 characters in length."
    );
  }
  if (data.result.trim().length > 2000) {
    throw new UnprocessableEntityError(
      "Validation Error: result must not exceed 2,000 characters in length."
    );
  }

  const isFollowUpRequired = Boolean(data.isFollowUpRequired);
  const followUpNote = validateFollowUpNote(isFollowUpRequired, data.followUpNote);

  let attachmentNotes: string | null = null;
  if (data.attachmentNotes !== undefined && data.attachmentNotes !== null) {
    if (typeof data.attachmentNotes !== "string") {
      throw new BadRequestError("attachmentNotes must be a string.");
    }
    const trimmedAttachment = data.attachmentNotes.trim();
    if (trimmedAttachment.length > 500) {
      throw new UnprocessableEntityError(
        "Validation Error: attachmentNotes must not exceed 500 characters in length."
      );
    }
    attachmentNotes = trimmedAttachment.length > 0 ? trimmedAttachment : null;
  }

  const actionDateTime = validateActionDateTime(data.actionDateTime);

  return {
    actionDateTime,
    description: data.description.trim(),
    result: data.result.trim(),
    isFollowUpRequired,
    followUpNote,
    attachmentNotes,
  };
}

/**
 * Validates payload for updating an existing ActionTaken (BR-05, BR-06).
 */
export function validateUpdateActionTaken(
  data: any,
  existingAction: {
    isFollowUpRequired: boolean;
    followUpNote: string | null;
  }
): {
  actionDateTime?: Date;
  description?: string;
  result?: string;
  isFollowUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
} {
  if (!data || typeof data !== "object") {
    throw new BadRequestError("Request body must be a JSON object.");
  }

  const updateData: {
    actionDateTime?: Date;
    description?: string;
    result?: string;
    isFollowUpRequired?: boolean;
    followUpNote?: string | null;
    attachmentNotes?: string | null;
  } = {};

  if (data.description !== undefined) {
    if (typeof data.description !== "string" || data.description.trim().length < 3) {
      throw new UnprocessableEntityError(
        "Validation Error: description must be at least 3 characters in length."
      );
    }
    if (data.description.trim().length > 2000) {
      throw new UnprocessableEntityError(
        "Validation Error: description must not exceed 2,000 characters in length."
      );
    }
    updateData.description = data.description.trim();
  }

  if (data.result !== undefined) {
    if (typeof data.result !== "string" || data.result.trim().length < 3) {
      throw new UnprocessableEntityError(
        "Validation Error: result must be at least 3 characters in length."
      );
    }
    if (data.result.trim().length > 2000) {
      throw new UnprocessableEntityError(
        "Validation Error: result must not exceed 2,000 characters in length."
      );
    }
    updateData.result = data.result.trim();
  }

  if (data.actionDateTime !== undefined) {
    updateData.actionDateTime = validateActionDateTime(data.actionDateTime);
  }

  if (data.attachmentNotes !== undefined) {
    if (data.attachmentNotes === null) {
      updateData.attachmentNotes = null;
    } else if (typeof data.attachmentNotes === "string") {
      const trimmed = data.attachmentNotes.trim();
      if (trimmed.length > 500) {
        throw new UnprocessableEntityError(
          "Validation Error: attachmentNotes must not exceed 500 characters in length."
        );
      }
      updateData.attachmentNotes = trimmed.length > 0 ? trimmed : null;
    } else {
      throw new BadRequestError("attachmentNotes must be a string or null.");
    }
  }

  const targetFollowUpRequired =
    data.isFollowUpRequired !== undefined
      ? Boolean(data.isFollowUpRequired)
      : existingAction.isFollowUpRequired;

  const targetFollowUpNote =
    data.followUpNote !== undefined ? data.followUpNote : existingAction.followUpNote;

  if (data.isFollowUpRequired !== undefined || data.followUpNote !== undefined) {
    updateData.isFollowUpRequired = targetFollowUpRequired;
    updateData.followUpNote = validateFollowUpNote(targetFollowUpRequired, targetFollowUpNote);
  }

  return updateData;
}
