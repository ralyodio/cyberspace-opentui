import { apiFetch } from "./client.ts";
import type { AuthTokens, Paginated, Post, Reply, User } from "./types.ts";

interface Single<T> {
  data: T;
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  const res = await apiFetch<Single<AuthTokens>>("/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return res.data;
}

export async function refreshToken(
  refreshToken: string,
): Promise<{ idToken: string; rtdbToken?: string }> {
  const res = await apiFetch<Single<{ idToken: string; rtdbToken?: string }>>(
    "/v1/auth/refresh",
    { method: "POST", body: { refreshToken } },
  );
  return res.data;
}

export async function listPosts(opts: { limit?: number; cursor?: string } = {}): Promise<Paginated<Post>> {
  return apiFetch<Paginated<Post>>("/v1/posts", {
    method: "GET",
    query: { limit: opts.limit, cursor: opts.cursor },
    auth: true,
  });
}

export async function getReplies(
  postId: string,
  opts: { limit?: number; cursor?: string } = {},
): Promise<Paginated<Reply>> {
  return apiFetch<Paginated<Reply>>(`/v1/posts/${encodeURIComponent(postId)}/replies`, {
    method: "GET",
    query: { limit: opts.limit, cursor: opts.cursor },
    auth: true,
  });
}

export async function getMe(): Promise<User> {
  const res = await apiFetch<Single<User>>("/v1/users/me", {
    method: "GET",
    auth: true,
  });
  return res.data;
}

export async function getUser(username: string): Promise<User> {
  const res = await apiFetch<Single<User>>(`/v1/users/${encodeURIComponent(username)}`, {
    method: "GET",
    auth: true,
  });
  return res.data;
}

export async function getUserPosts(
  username: string,
  opts: { limit?: number; cursor?: string } = {},
): Promise<Paginated<Post>> {
  return apiFetch<Paginated<Post>>(`/v1/users/${encodeURIComponent(username)}/posts`, {
    method: "GET",
    query: { limit: opts.limit, cursor: opts.cursor },
    auth: true,
  });
}

export interface CreatePostInput {
  content: string;
  title?: string;
  slug?: string;
  topics?: string[];
  isPublic?: boolean;
  isNSFW?: boolean;
}

export interface CreatePostResult {
  postId: string;
  slug: string;
  title?: string;
}

export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  const res = await apiFetch<Single<CreatePostResult>>("/v1/posts", {
    method: "POST",
    body: input,
    auth: true,
  });
  return res.data;
}

export interface CreateReplyInput {
  postId: string;
  content: string;
  parentReplyId?: string;
}

export async function createReply(input: CreateReplyInput): Promise<{ replyId: string }> {
  const res = await apiFetch<Single<{ replyId: string }>>("/v1/replies", {
    method: "POST",
    body: input,
    auth: true,
  });
  return res.data;
}

export async function deletePost(postId: string): Promise<void> {
  await apiFetch<unknown>(`/v1/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function deleteReply(replyId: string): Promise<void> {
  await apiFetch<unknown>(`/v1/replies/${encodeURIComponent(replyId)}`, {
    method: "DELETE",
    auth: true,
  });
}
