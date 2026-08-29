import { baseApi } from "./baseApi";

export const contactApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        CreateContact: builder.mutation({
            query: (params) => ({
                url: "/auth/contact/",
                method: "POST",
                body: { ...params },
            }),
            invalidatesTags: ["User"],
        }), 
})})

export const { useCreateContactMutation } = contactApi