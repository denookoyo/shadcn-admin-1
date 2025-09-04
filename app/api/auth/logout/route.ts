import { NextResponse } from 'next/server'

export async function POST() {
  const res = new NextResponse(null, { status: 204 })
  res.cookies.set('session', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0, path: '/' })
  return res
}

