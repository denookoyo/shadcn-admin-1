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
import { marketplaceConsumerMode } from '@/lib/marketplace-consumer'

export default function SignUp() {
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Create an account
          </CardTitle>
          <CardDescription>
            {marketplaceConsumerMode
              ? 'Create your account in Gang Ledger, then return here to use the marketplace.'
              : 'Use Google sign-in to create your marketplace account.'}{' '}
            <br />
            Already have an account?{' '}
            <Link
              to='/sign-in'
              className='hover:text-primary underline underline-offset-4'
            >
              Sign In
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <GoogleSignInButton />
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600'>
              {marketplaceConsumerMode
                ? 'Direct registration is disabled in marketplace consumer mode. Gang Ledger is the system of record for identity and account creation.'
                : 'Direct email/password registration is not enabled for the live marketplace. Google sign-in creates your account automatically on first access.'}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            By creating an account, you agree to our{' '}
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
