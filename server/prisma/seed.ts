import bcrypt from "bcryptjs";
import { getPrisma } from "../src/prisma.js";

// Lab 3 Idempotent Database Seed Script
// Seeds Categories, Related Systems, Users (Requesters, IT Staff, Admin), and Sample Tickets.
// Requirement: running the seed multiple times must NOT duplicate records.
async function main() {
  const prisma = getPrisma();

  // 1. Seed Categories
  const categoryNames = [
    "Account and Access",
    "Hardware",
    "Software",
    "Network",
  ];
  const categoriesMap = new Map<string, number>();
  for (const name of categoryNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    categoriesMap.set(name, cat.id);
  }

  // 2. Seed Related Systems
  const relatedSystemNames = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];
  const systemsMap = new Map<string, number>();
  for (const name of relatedSystemNames) {
    const sys = await prisma.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
    systemsMap.set(name, sys.id);
  }

  // 3. Hash Passwords
  const standardPasswordHash = bcrypt.hashSync("Password123!", 10);
  const initialPasswordHash = bcrypt.hashSync("InitialPass123!", 10);
  const adminPasswordHash = bcrypt.hashSync("AdminPass123!", 10);

  // 4. Seed Users (Requesters, IT Staff, Administrator)
  const usersToSeed = [
    // Requester Accounts (Preserved from Lab 2 for zero regression)
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      role: "REQUESTER" as const,
      passwordHash: standardPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "David Lee",
      email: "david.lee@kmutt.ac.th",
      role: "REQUESTER" as const,
      passwordHash: standardPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@kmutt.ac.th",
      role: "REQUESTER" as const,
      passwordHash: standardPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@kmutt.ac.th",
      role: "REQUESTER" as const,
      passwordHash: standardPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Alex Inactive",
      email: "alex.inactive@kmutt.ac.th",
      role: "REQUESTER" as const,
      passwordHash: standardPasswordHash,
      isActive: false,
      mustChangePassword: false,
    },
    {
      name: "FirstLogin Requester",
      email: "firstlogin.requester@toktickit.com",
      role: "REQUESTER" as const,
      passwordHash: initialPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    // IT Staff Accounts
    {
      name: "Michael Brown",
      email: "staff.michael@toktickit.com",
      role: "IT_STAFF" as const,
      passwordHash: standardPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "Sarah Johnson",
      email: "staff.sarah@toktickit.com",
      role: "IT_STAFF" as const,
      passwordHash: standardPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: "David Lee",
      email: "staff.david@toktickit.com",
      role: "IT_STAFF" as const,
      passwordHash: initialPasswordHash,
      isActive: true,
      mustChangePassword: true,
    },
    {
      name: "Kevin Patel",
      email: "kpatel@toktickit.com",
      role: "IT_STAFF" as const,
      passwordHash: standardPasswordHash,
      isActive: false,
      mustChangePassword: false,
    },
    // Administrator Account
    {
      name: "John Smith",
      email: "admin@toktickit.com",
      role: "ADMINISTRATOR" as const,
      passwordHash: adminPasswordHash,
      isActive: true,
      mustChangePassword: false,
    },
  ];

  const usersMap = new Map<string, number>();
  for (const u of usersToSeed) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash: u.passwordHash,
        isActive: u.isActive,
        mustChangePassword: u.mustChangePassword,
      },
      create: u,
    });
    usersMap.set(u.email, user.id);
  }

  // 5. Seed Sample Tickets
  const jenniferId = usersMap.get("jennifer.anderson@kmutt.ac.th")!;
  const davidId = usersMap.get("david.lee@kmutt.ac.th")!;
  const sarahId = usersMap.get("sarah.johnson@kmutt.ac.th")!;
  const staffMichaelId = usersMap.get("staff.michael@toktickit.com")!;
  const staffSarahId = usersMap.get("staff.sarah@toktickit.com")!;

  const sampleTickets = [
    // --- Jennifer Anderson's Tickets (Preserving all Lab 2 tickets for zero test regression) ---
    {
      ticketNumber: "TKT-2026-000101",
      summary: "Laptop battery drains quickly during lectures",
      description: "My corporate laptop battery depletes from 100% to under 15% within 40 minutes of use without being plugged in.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "IN_PROGRESS" as const,
      ticketOwnerId: staffMichaelId,
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-25T08:30:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000102",
      summary: "Cannot connect to campus VPN from home",
      description: "Getting connection timeout error 800 when attempting to establish a secure VPN connection from home Wi-Fi.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "OPEN" as const,
      ticketOwnerId: null,
      categoryName: "Network",
      systemName: "VPN",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-26T09:15:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000103",
      summary: "Outlook email client not syncing incoming messages",
      description: "Outlook client on desktop has stopped syncing since yesterday morning. Webmail is working fine.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "RESOLVED" as const,
      resolutionSummary: "Re-authenticated mail profile and rebuilt local cache.",
      ticketOwnerId: staffSarahId,
      categoryName: "Software",
      systemName: "Email",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-26T11:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000104",
      summary: "Request access to Grade Submission portal for semester 1",
      description: "Need TA role access permissions configured on the Grade Submission system for CPE334 course.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "CLOSED" as const,
      resolutionSummary: "Provisioned TA security group role in LDAP directory.",
      ticketOwnerId: staffMichaelId,
      categoryName: "Account and Access",
      systemName: "Grade Submission App",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-27T10:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000105",
      summary: "Classroom projector HDMI port is loose",
      description: "Room CB2-301 projector HDMI cable loses signal whenever the podium is bumped.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "OPEN" as const,
      ticketOwnerId: null,
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-27T14:20:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000106",
      summary: "LEB2 App fails to upload assignment rubric files",
      description: "When attempting to upload a PDF rubric file into LEB2, the screen freezes at 99% progress.",
      requestedPriority: "URGENT" as const,
      itPriority: "HIGH" as const,
      currentStatus: "IN_PROGRESS" as const,
      ticketOwnerId: staffMichaelId,
      categoryName: "Software",
      systemName: "LEB2 App",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-28T08:45:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000107",
      summary: "Campus Wi-Fi authentication certificate expired",
      description: "KMUTT-Secure Wi-Fi is reporting an untrusted security certificate error when connecting on macOS.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "RESOLVED" as const,
      resolutionSummary: "Pushed updated 802.1X certificate to MDM-enrolled profiles.",
      ticketOwnerId: staffSarahId,
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-28T13:10:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000108",
      summary: "Department printer in room 402 is out of toner",
      description: "Black toner cartridge is depleted on the 4th floor staff shared network printer.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "OPEN" as const,
      ticketOwnerId: null,
      categoryName: "Hardware",
      systemName: "Printer",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-29T09:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000109",
      summary: "Reset MFA token for KMUTT single sign-on",
      description: "Replaced my mobile phone and lost access to the Microsoft Authenticator MFA app.",
      requestedPriority: "URGENT" as const,
      itPriority: "URGENT" as const,
      currentStatus: "RESOLVED" as const,
      resolutionSummary: "Verified government ID via video call and reset MFA device binding.",
      ticketOwnerId: staffMichaelId,
      categoryName: "Account and Access",
      systemName: "Email",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-29T15:30:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000110",
      summary: "MATLAB software license activation failing",
      description: "Campus campus-wide MATLAB license throws error code -9 when attempting to activate on newly imaged PC.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "OPEN" as const,
      ticketOwnerId: null,
      categoryName: "Software",
      systemName: "Corporate Laptop",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-30T10:15:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000111",
      summary: "Cannot access engineering lab file share server",
      description: "SMB connection to \\\\storage.cpe.kmutt.ac.th\\lab returns Access Denied error.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "IN_PROGRESS" as const,
      ticketOwnerId: staffMichaelId,
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-30T16:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000112",
      summary: "Dual monitor docking station not detecting second display",
      description: "USB-C docking station in office 405 only outputs video to monitor 1, monitor 2 remains black.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "OPEN" as const,
      ticketOwnerId: null,
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T08:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000113",
      summary: "Request license renewal for JetBrains All Products Pack",
      description: "Faculty JetBrains academic educational pack subscription expired at the end of last month.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "RESOLVED" as const,
      resolutionSummary: "Renewed educational domain license through JetBrains academic portal.",
      ticketOwnerId: staffMichaelId,
      categoryName: "Software",
      systemName: "Email",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T08:30:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000114",
      summary: "Classroom Wi-Fi disconnects frequently during online quizzes",
      description: "Students in room CB2-401 experienced repeated disconnection from KMUTT-Secure Wi-Fi.",
      requestedPriority: "URGENT" as const,
      itPriority: "HIGH" as const,
      currentStatus: "IN_PROGRESS" as const,
      ticketOwnerId: staffSarahId,
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T09:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000115",
      summary: "Request Gitlab server account setup for new lab assistant",
      description: "Please provision a developer account on internal gitlab.cpe.kmutt.ac.th for our research assistant.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "LOW" as const,
      currentStatus: "OPEN" as const,
      ticketOwnerId: null,
      categoryName: "Account and Access",
      systemName: "LEB2 App",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T09:45:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000116",
      summary: "Wireless presentation clicker is missing from lecture hall",
      description: "The Logitech spotlight remote clicker in room CB2-201 is missing from the AV console drawer.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "CLOSED" as const,
      resolutionSummary: "Replaced with backup presentation remote from AV inventory.",
      ticketOwnerId: staffMichaelId,
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T10:15:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000117",
      summary: "VPN client crashes on macOS Sequoia update",
      description: "Cisco AnyConnect VPN app crashes immediately upon launch after upgrading to macOS 15.0.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "OPEN" as const,
      ticketOwnerId: null,
      categoryName: "Software",
      systemName: "VPN",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T10:45:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000118",
      summary: "Color laser printer paper jam error sensor stuck",
      description: "3rd floor staff room color laser printer displays paper jam tray 2 error even when tray is clear.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "IN_PROGRESS" as const,
      ticketOwnerId: staffMichaelId,
      categoryName: "Hardware",
      systemName: "Printer",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T11:15:00.000Z"),
    },

    // --- David Lee's Tickets ---
    {
      ticketNumber: "TKT-2026-000201",
      summary: "Office network printer keeps showing offline status",
      description: "HP LaserJet on 3rd floor IT wing drops off the network periodically and requires power cycle.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "LOW" as const,
      currentStatus: "OPEN" as const,
      ticketOwnerId: staffMichaelId,
      categoryName: "Hardware",
      systemName: "Printer",
      requesterId: davidId,
      createdAt: new Date("2026-08-28T10:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000202",
      summary: "Request SSH bastion access to staging servers",
      description: "Need public key added to bastion host for maintenance of IT department staging cluster.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "RESOLVED" as const,
      resolutionSummary: "Added public key to authorized_keys on bastion01.infra.cpe.kmutt.ac.th.",
      ticketOwnerId: staffSarahId,
      categoryName: "Account and Access",
      systemName: "VPN",
      requesterId: davidId,
      createdAt: new Date("2026-08-29T11:30:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000203",
      summary: "Wi-Fi coverage dead spot in IT conference room 3B",
      description: "Signal drops to 1 bar inside room 3B during team meetings, causing video call drops.",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "IN_PROGRESS" as const,
      ticketOwnerId: staffMichaelId,
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterId: davidId,
      createdAt: new Date("2026-08-30T14:15:00.000Z"),
    },

    // --- Sarah Johnson's Ticket ---
    {
      ticketNumber: "TKT-2026-000301",
      summary: "Adobe Creative Cloud installation license error",
      description: "Creative Cloud desktop app reports license expired when trying to install Illustrator on new workstation.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "OPEN" as const,
      ticketOwnerId: null,
      categoryName: "Software",
      systemName: "Corporate Laptop",
      requesterId: sarahId,
      createdAt: new Date("2026-08-31T09:30:00.000Z"),
    },

    // --- Additional Tickets Covering All 8 Statuses (NEW, WAITING_FOR_REQUESTER, REOPENED, CANCELLED) ---
    {
      ticketNumber: "TKT-2026-000401",
      summary: "Need clarification on requested database credentials",
      description: "Requester requested elevated database credentials but did not specify the schema or environment.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "WAITING_FOR_REQUESTER" as const,
      ticketOwnerId: staffMichaelId,
      categoryName: "Account and Access",
      systemName: "LEB2 App",
      requesterId: jenniferId,
      createdAt: new Date("2026-09-01T09:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000402",
      summary: "Projector flickering again after previous bulb replacement",
      description: "Room CB2-301 projector started flickering again today despite the bulb being replaced last week.",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "REOPENED" as const,
      ticketOwnerId: staffMichaelId,
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterId: jenniferId,
      createdAt: new Date("2026-09-02T10:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000403",
      summary: "Duplicate request for monitor stand",
      description: "Submitted duplicate ticket earlier this morning, cancelling this one.",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "CANCELLED" as const,
      ticketOwnerId: staffSarahId,
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterId: davidId,
      createdAt: new Date("2026-09-02T11:00:00.000Z"),
    },
  ];

  for (const t of sampleTickets) {
    const categoryId = categoriesMap.get(t.categoryName)!;
    const relatedSystemId = systemsMap.get(t.systemName)!;

    await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        ticketOwnerId: t.ticketOwnerId,
        resolutionSummary: (t as any).resolutionSummary ?? null,
        categoryId,
        relatedSystemId,
        requesterId: t.requesterId,
      },
      create: {
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        ticketOwnerId: t.ticketOwnerId,
        resolutionSummary: (t as any).resolutionSummary ?? null,
        categoryId,
        relatedSystemId,
        requesterId: t.requesterId,
        createdAt: t.createdAt,
      },
    });
  }

  console.log(
    `Successfully seeded categories, systems, users (${usersToSeed.length}), and sample tickets (${sampleTickets.length}).`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
