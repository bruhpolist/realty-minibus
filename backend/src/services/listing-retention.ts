import { prisma } from "../db/prisma.js";

export async function pruneOldListings(maxListings: number): Promise<number> {
  if (!Number.isFinite(maxListings) || maxListings <= 0) {
    return 0;
  }

  const total = await prisma.listing.count();
  const toDelete = total - maxListings;
  if (toDelete <= 0) {
    return 0;
  }

  const oldest = await prisma.listing.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
    take: toDelete
  });

  if (oldest.length === 0) {
    return 0;
  }

  const { count } = await prisma.listing.deleteMany({
    where: {
      id: {
        in: oldest.map((item) => item.id)
      }
    }
  });

  return count;
}
