import { adminAuth } from "@/lib/firebase/admin"; 
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    
    // Verify the ID token sent from the client
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Set a simple cookie for the Server Component to read
    const cookieStore = cookies();
    cookieStore.set("auth-uid", uid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auth sync error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}