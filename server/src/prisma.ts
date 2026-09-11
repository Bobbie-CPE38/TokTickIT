import { PrismaClient } from "@prisma/client";

export interface CompatiblePrismaClient extends Omit<PrismaClient, "attachment" | "ticket"> {
  developmentRequester: any;
  attachment: any;
  ticket: any;
}

// Lazy singleton: the client is created on first use, not at import time.
// This keeps route modules and tests that don't touch the DB (e.g. /api/health)
// free of database side effects.
let client: PrismaClient | null = null;

function normalizeTicketData(data: any) {
  if (!data) return;
  if ("ticketOwner" in data) {
    delete data.ticketOwner;
  }
  if (data.currentStatus === "PENDING") {
    data.currentStatus = "WAITING_FOR_REQUESTER";
  }
}

export function getPrisma(): CompatiblePrismaClient {
  if (!client) {
    client = new PrismaClient();

    // Compatibility layer for Lab 2 developmentRequester queries
    Object.defineProperty(client, "developmentRequester", {
      get() {
        return (client as any).user;
      },
      configurable: true,
      enumerable: true,
    });

    // Compatibility proxy for Lab 2 attachment creation using uploadedByRequesterId
    const originalAttachment = (client as any).attachment;
    (client as any).attachment = new Proxy(originalAttachment, {
      get(target, prop, receiver) {
        if (prop === "create") {
          return (args: any) => {
            if (args?.data && "uploadedByRequesterId" in args.data) {
              args.data.uploadedByUserId = args.data.uploadedByRequesterId;
              delete args.data.uploadedByRequesterId;
            }
            return target.create(args);
          };
        }
        if (prop === "createMany") {
          return (args: any) => {
            if (Array.isArray(args?.data)) {
              for (const item of args.data) {
                if ("uploadedByRequesterId" in item) {
                  item.uploadedByUserId = item.uploadedByRequesterId;
                  delete item.uploadedByRequesterId;
                }
              }
            }
            return target.createMany(args);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    // Compatibility proxy for Lab 2 ticket creation with string ticketOwner or PENDING status
    const originalTicket = (client as any).ticket;
    (client as any).ticket = new Proxy(originalTicket, {
      get(target, prop, receiver) {
        if (prop === "create") {
          return (args: any) => {
            if (args?.data) {
              normalizeTicketData(args.data);
            }
            return target.create(args);
          };
        }
        if (prop === "createMany") {
          return (args: any) => {
            if (Array.isArray(args?.data)) {
              for (const item of args.data) {
                normalizeTicketData(item);
              }
            }
            return target.createMany(args);
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }
  return client as unknown as CompatiblePrismaClient;
}
