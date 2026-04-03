import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.424720195459-e96fflkrckb12m5449vm7qde0rfu195i.apps.googleusercontent.com,
      clientSecret: process.env.GOCSPX-xxxxx,
    })
  ],
})
