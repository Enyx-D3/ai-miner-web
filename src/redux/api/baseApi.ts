import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { logout } from "../features/authSlice";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "/api/";
type ServerError = { status?: number; data?: unknown };

const baseQuery = fetchBaseQuery({
  baseUrl,
  credentials: "same-origin",
  prepareHeaders: (headers) => {
    headers.set("ngrok-skip-browser-warning", "true");
    return headers;
  },
});
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  if (result.error) {
    const errorData = result.error as ServerError;
    // Preserve the full server error response so catch blocks can read
    // err?.data?.message, err?.data?.error, etc.
    result.error = {
      status: errorData.status || 500,
      data: errorData.data ?? "Something went wrong",
    };
  }

  if (result.error && result.error.status == 401) {
    api.dispatch(logout());
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
  tagTypes: ["User"],
});
