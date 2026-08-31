import { getPrisma } from "../src/prisma.js";

// Lab 2 Idempotent Database Seed Script
// Seeds Categories, Related Systems, Development Requesters, and Sample Tickets.
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

  // 3. Seed Development Requesters
  const requesters = [
    {
      name: "Jennifer Anderson",
      email: "jennifer.anderson@kmutt.ac.th",
      department: "Computer Engineering",
      isActive: true,
    },
    {
      name: "David Lee",
      email: "david.lee@kmutt.ac.th",
      department: "Information Technology",
      isActive: true,
    },
    {
      name: "Sarah Johnson",
      email: "sarah.johnson@kmutt.ac.th",
      department: "Digital Media",
      isActive: true,
    },
    {
      name: "Michael Brown",
      email: "michael.brown@kmutt.ac.th",
      department: "Electrical Engineering",
      isActive: true,
    },
    {
      name: "Alex Inactive",
      email: "alex.inactive@kmutt.ac.th",
      department: "Alumni Relations",
      isActive: false,
    },
  ];
  const requestersMap = new Map<string, number>();
  for (const req of requesters) {
    const r = await prisma.developmentRequester.upsert({
      where: { email: req.email },
      update: {
        name: req.name,
        department: req.department,
        isActive: req.isActive,
      },
      create: req,
    });
    requestersMap.set(req.email, r.id);
  }

  // 4. Seed Sample Tickets for Reviewer Testing
  const jenniferId = requestersMap.get("jennifer.anderson@kmutt.ac.th")!;
  const davidId = requestersMap.get("david.lee@kmutt.ac.th")!;
  const sarahId = requestersMap.get("sarah.johnson@kmutt.ac.th")!;

  const sampleTickets = [
    // --- Jennifer Anderson's Tickets (12 tickets for pagination & multi-filter testing) ---
    {
      ticketNumber: "TKT-2026-000101",
      summary: "Laptop battery drains quickly during lectures",
      description: "My corporate laptop battery depletes from 100% to under 15% within 40 minutes of use without being plugged in.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      ticketOwner: "Michael Brown",
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-25T08:30:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000102",
      summary: "Cannot connect to campus VPN from home",
      description: "Getting connection timeout error 800 when attempting to establish a secure VPN connection from home Wi-Fi.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "OPEN",
      ticketOwner: null,
      categoryName: "Network",
      systemName: "VPN",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-26T09:15:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000103",
      summary: "Outlook email client not syncing incoming messages",
      description: "Outlook client on desktop has stopped syncing since yesterday morning. Webmail is working fine.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "RESOLVED",
      ticketOwner: "Sarah Johnson",
      categoryName: "Software",
      systemName: "Email",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-26T11:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000104",
      summary: "Request access to Grade Submission portal for semester 1",
      description: "Need TA role access permissions configured on the Grade Submission system for CPE334 course.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "CLOSED",
      ticketOwner: "David Lee",
      categoryName: "Account and Access",
      systemName: "Grade Submission App",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-27T10:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000105",
      summary: "Classroom projector HDMI port is loose",
      description: "Room CB2-301 projector HDMI cable loses signal whenever the podium is bumped.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "OPEN",
      ticketOwner: null,
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-27T14:20:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000106",
      summary: "LEB2 App fails to upload assignment rubric files",
      description: "When attempting to upload a PDF rubric file into LEB2, the screen freezes at 99% progress.",
      requestedPriority: "URGENT",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      ticketOwner: "Michael Brown",
      categoryName: "Software",
      systemName: "LEB2 App",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-28T08:45:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000107",
      summary: "Campus Wi-Fi authentication certificate expired",
      description: "KMUTT-Secure Wi-Fi is reporting an untrusted security certificate error when connecting on macOS.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "RESOLVED",
      ticketOwner: "Sarah Johnson",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-28T13:10:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000108",
      summary: "Department printer in room 402 is out of toner",
      description: "Black toner cartridge is depleted on the 4th floor staff shared network printer.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "OPEN",
      ticketOwner: null,
      categoryName: "Hardware",
      systemName: "Printer",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-29T09:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000109",
      summary: "Reset MFA token for KMUTT single sign-on",
      description: "Replaced my mobile phone and lost access to the Microsoft Authenticator MFA app.",
      requestedPriority: "URGENT",
      itPriority: "URGENT",
      currentStatus: "RESOLVED",
      ticketOwner: "David Lee",
      categoryName: "Account and Access",
      systemName: "Email",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-29T15:30:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000110",
      summary: "MATLAB software license activation failing",
      description: "Campus campus-wide MATLAB license throws error code -9 when attempting to activate on newly imaged PC.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "OPEN",
      ticketOwner: null,
      categoryName: "Software",
      systemName: "Corporate Laptop",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-30T10:15:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000111",
      summary: "Cannot access engineering lab file share server",
      description: "SMB connection to \\\\storage.cpe.kmutt.ac.th\\lab returns Access Denied error.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      ticketOwner: "Michael Brown",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-30T16:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000112",
      summary: "Dual monitor docking station not detecting second display",
      description: "USB-C docking station in office 405 only outputs video to monitor 1, monitor 2 remains black.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "OPEN",
      ticketOwner: null,
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T08:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000113",
      summary: "Request license renewal for JetBrains All Products Pack",
      description: "Faculty JetBrains academic educational pack subscription expired at the end of last month.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "RESOLVED",
      ticketOwner: "David Lee",
      categoryName: "Software",
      systemName: "Email",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T08:30:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000114",
      summary: "Classroom Wi-Fi disconnects frequently during online quizzes",
      description: "Students in room CB2-401 experienced repeated disconnection from KMUTT-Secure Wi-Fi.",
      requestedPriority: "URGENT",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      ticketOwner: "Sarah Johnson",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T09:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000115",
      summary: "Request Gitlab server account setup for new lab assistant",
      description: "Please provision a developer account on internal gitlab.cpe.kmutt.ac.th for our research assistant.",
      requestedPriority: "MEDIUM",
      itPriority: "LOW",
      currentStatus: "OPEN",
      ticketOwner: null,
      categoryName: "Account and Access",
      systemName: "LEB2 App",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T09:45:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000116",
      summary: "Wireless presentation clicker is missing from lecture hall",
      description: "The Logitech spotlight remote clicker in room CB2-201 is missing from the AV console drawer.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "CLOSED",
      ticketOwner: "Michael Brown",
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T10:15:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000117",
      summary: "VPN client crashes on macOS Sequoia update",
      description: "Cisco AnyConnect VPN app crashes immediately upon launch after upgrading to macOS 15.0.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "OPEN",
      ticketOwner: null,
      categoryName: "Software",
      systemName: "VPN",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T10:45:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000118",
      summary: "Color laser printer paper jam error sensor stuck",
      description: "3rd floor staff room color laser printer displays paper jam tray 2 error even when tray is clear.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      ticketOwner: "Michael Brown",
      categoryName: "Hardware",
      systemName: "Printer",
      requesterId: jenniferId,
      createdAt: new Date("2026-08-31T11:15:00.000Z"),
    },

    // --- David Lee's Tickets (3 tickets for isolation & switcher verification) ---
    {
      ticketNumber: "TKT-2026-000201",
      summary: "Office network printer keeps showing offline status",
      description: "HP LaserJet on 3rd floor IT wing drops off the network periodically and requires power cycle.",
      requestedPriority: "MEDIUM",
      itPriority: "LOW",
      currentStatus: "OPEN",
      ticketOwner: "Michael Brown",
      categoryName: "Hardware",
      systemName: "Printer",
      requesterId: davidId,
      createdAt: new Date("2026-08-28T10:00:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000202",
      summary: "Request SSH bastion access to staging servers",
      description: "Need public key added to bastion host for maintenance of IT department staging cluster.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "RESOLVED",
      ticketOwner: "Sarah Johnson",
      categoryName: "Account and Access",
      systemName: "VPN",
      requesterId: davidId,
      createdAt: new Date("2026-08-29T11:30:00.000Z"),
    },
    {
      ticketNumber: "TKT-2026-000203",
      summary: "Wi-Fi coverage dead spot in IT conference room 3B",
      description: "Signal drops to 1 bar inside room 3B during team meetings, causing video call drops.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      ticketOwner: "Michael Brown",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requesterId: davidId,
      createdAt: new Date("2026-08-30T14:15:00.000Z"),
    },

    // --- Sarah Johnson's Ticket (1 ticket) ---
    {
      ticketNumber: "TKT-2026-000301",
      summary: "Adobe Creative Cloud installation license error",
      description: "Creative Cloud desktop app reports license expired when trying to install Illustrator on new workstation.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "OPEN",
      ticketOwner: null,
      categoryName: "Software",
      systemName: "Corporate Laptop",
      requesterId: sarahId,
      createdAt: new Date("2026-08-31T09:30:00.000Z"),
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
        requestedPriority: t.requestedPriority as any,
        itPriority: t.itPriority as any,
        currentStatus: t.currentStatus as any,
        ticketOwner: t.ticketOwner,
        categoryId,
        relatedSystemId,
        requesterId: t.requesterId,
      },
      create: {
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority as any,
        itPriority: t.itPriority as any,
        currentStatus: t.currentStatus as any,
        ticketOwner: t.ticketOwner,
        categoryId,
        relatedSystemId,
        requesterId: t.requesterId,
        createdAt: t.createdAt,
      },
    });
  }

  console.log(`Successfully seeded categories, systems, requesters, and ${sampleTickets.length} sample tickets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
