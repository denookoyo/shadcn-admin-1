import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import AuthLayout from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'
import { GoogleSignInButton } from '../google-signin'

export default function SignIn() {
  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight text-slate-900'>Sign in to Hedgetech</CardTitle>
          <CardDescription>
            Use your marketplace credentials or continue with Google to access your seller workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            <GoogleSignInButton />
            <div className='text-center text-xs text-muted-foreground'>or continue with email</div>
            <UserAuthForm />
          </div>
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            By signing in, you agree to the{' '}
            <a
              href='/terms'
              className='hover:text-primary underline underline-offset-4'
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href='/privacy'
              className='hover:text-primary underline underline-offset-4'
            >
              Privacy Policy
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
