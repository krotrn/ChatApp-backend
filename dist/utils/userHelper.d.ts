export declare const validateUser: (userIds: string[]) => Promise<Array<{
    id: string;
    fullName: string;
    avatar: string | null;
}>>;
