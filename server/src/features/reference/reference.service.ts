import { getPrisma } from "../../prisma.js";

export async function fetchCategories() {
  const prisma = getPrisma();
  return prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { id: "asc" },
  });
}

export async function fetchRelatedSystems() {
  const prisma = getPrisma();
  return prisma.relatedSystem.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function fetchActiveRequesters() {
  const prisma = getPrisma();
  const requesters = await prisma.user.findMany({
    where: { isActive: true, role: "REQUESTER" },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: { id: "asc" },
  });

  return requesters.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    department:
      r.name === "Jennifer Anderson"
        ? "Computer Engineering"
        : r.name === "David Lee"
        ? "Information Technology"
        : r.name === "Sarah Johnson"
        ? "Digital Media"
        : r.name === "Michael Brown"
        ? "Electrical Engineering"
        : "Engineering",
    isActive: true,
  }));
}
