
export interface SignInUser {
    email: string;
    password: string;
}

export interface SignUpUser {
    email: string;
    password: string;
}

export interface ForgotPasswordUser {
    email: string;
}

export interface ResetPasswordUser {
    token: string;
    password: string;
}

