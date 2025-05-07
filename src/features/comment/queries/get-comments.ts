"use server";

import { getAuth } from "@/features/auth/queries/get-auth";
import { isOwner } from "@/features/auth/utils/is-owner";
import { prisma } from "@/lib/prisma";

export const getComments = async (ticketId: string, cursor?: string) => {
  const { user } = await getAuth();
  const actualCursor = cursor as unknown as {
    id: string;
    createdAt: number;
  };

  const where = {
    ticketId,
  };

  const take = 2;

  let [comments, count] = await prisma.$transaction([
    prisma.comment.findMany({
      where,
      take: take + 1,
      cursor: cursor
        ? { createdAt: new Date(actualCursor.createdAt), id: actualCursor.id }
        : undefined,
      skip: cursor ? 1 : 0,
      include: {
        user: {
          select: {
            username: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    }),
    prisma.comment.count({
      where,
    }),
  ]);

  const hasNextPage = comments.length > take;

  comments = hasNextPage ? comments.slice(0, -1) : comments;

  const lastComment = comments.at(-1);

  return {
    list: comments.map((comment) => ({
      ...comment,
      isOwner: isOwner(user, comment),
    })),
    metadata: {
      count,
      hasNextPage,
      cursor: lastComment
        ? {
            createdAt: lastComment.createdAt.valueOf(),
            id: lastComment.id,
          }
        : undefined,
    },
  };
};
