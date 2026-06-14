import { Link } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import AuthLayout from '../auth-layout'
import { GoogleSignInButton } from '../google-signin'

export default function SignIn() {
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight text-slate-900'>
            Sign in to Personal Finance
          </CardTitle>
          <CardDescription>
            Continue with Google to access your budget dashboard, spending
            history, and money goals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <GoogleSignInButton />
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600'>
              Password sign-in is disabled for Personal Finance. Use Google
              sign-in or contact support if your workspace needs access help.
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            By signing in, you agree to the{' '}
            <Link
              to='/terms'
              className='hover:text-primary underline underline-offset-4'
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              to='/privacy'
              className='hover:text-primary underline underline-offset-4'
            >
              Privacy Policy
            </Link>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
