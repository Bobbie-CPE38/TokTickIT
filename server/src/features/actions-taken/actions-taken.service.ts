import { getPrisma } from "../../prisma.js";
import { AuthUser } from "../../core/tokens.js";
import {
  NotFoundError,
  ForbiddenError,
  UnprocessableEntityError,
} from "../../core/errors.js";
import {
  validateCreateActionTaken,
  validateUpdateActionTaken,
} from "./actions-taken.validation.js";

/**
 * Retrieves all Actions Taken for a specific ticket in chronological order (BR-08).
 * Enforces Requester isolation: returns 404 if unowned (BR-07, BR-13).
 */
export async function fetchTicketActions(ticketId: number, user: AuthUser) {
  const prisma = getPrisma();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, requesterId: true },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  if (user.role === "REQUESTER" && ticket.requesterId !== user.id) {
    throw new NotFoundError("Ticket not found.");
  }

  return await prisma.actionTaken.findMany({
    where: { ticketId },
    orderBy: [{ actionDateTime: "asc" }, { createdAt: "asc" }],
    include: {
      performedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Records a new technical Action Taken under a ticket (FR-01, BR-01 to BR-06).
 * Automatically binds performedByUserId to the authenticated user (BR-03).
 * Prohibits Requesters (BR-07) and inactive users (BR-04).
 */
export async function createTicketAction(
  ticketId: number,
  data: any,
  user: AuthUser
) {
  if (user.role === "REQUESTER") {
    throw new ForbiddenError("Forbidden: Requesters are not permitted to record Actions Taken.");
  }

  if (!user.isActive) {
    throw new ForbiddenError("Forbidden: Inactive user accounts cannot record Actions Taken.");
  }

  const prisma = getPrisma();

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true },
  });

  if (!ticket) {
    throw new NotFoundError("Ticket not found.");
  }

  const validated = validateCreateActionTaken(data);

  return await prisma.actionTaken.create({
    data: {
      ticketId,
      performedByUserId: user.id, // Authoritative performer binding (BR-03)
      actionDateTime: validated.actionDateTime,
      description: validated.description,
      result: validated.result,
      isFollowUpRequired: validated.isFollowUpRequired,
      followUpNote: validated.followUpNote,
      attachmentNotes: validated.attachmentNotes,
    },
    include: {
      performedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}

/**
 * Retrieves details of a single Action Taken (FR-01, BR-07, BR-13).
 * Enforces Requester isolation: returns 404 if parent ticket is unowned.
 */
export async function fetchActionById(actionId: number, user: AuthUser) {
  const prisma = getPrisma();

  const action = await prisma.actionTaken.findUnique({
    where: { id: actionId },
    include: {
      ticket: {
        select: {
          id: true,
          requesterId: true,
        },
      },
      performedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!action) {
    throw new NotFoundError("Action Taken not found.");
  }

  if (user.role === "REQUESTER" && action.ticket.requesterId !== user.id) {
    throw new NotFoundError("Action Taken not found.");
  }

  const { ticket, ...actionDetails } = action;
  return actionDetails;
}

/**
 * Updates an existing Action Taken (FR-03, BR-04, BR-05, BR-06).
 * Restricted to active IT Staff and Administrators.
 */
export async function updateAction(
  actionId: number,
  data: any,
  user: AuthUser
) {
  if (user.role === "REQUESTER") {
    throw new ForbiddenError("Forbidden: Requesters are not permitted to update Actions Taken.");
  }

  if (!user.isActive) {
    throw new ForbiddenError("Forbidden: Inactive user accounts cannot update Actions Taken.");
  }

  const prisma = getPrisma();

  const existing = await prisma.actionTaken.findUnique({
    where: { id: actionId },
  });

  if (!existing) {
    throw new NotFoundError("Action Taken not found.");
  }

  const updateData = validateUpdateActionTaken(data, existing);

  return await prisma.actionTaken.update({
    where: { id: actionId },
    data: updateData,
    include: {
      performedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });
}
