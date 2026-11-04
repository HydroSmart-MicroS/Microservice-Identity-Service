export interface AccountDeletion {
 check(user:string):Promise<{allowed:boolean;retentionDays:number}>;
 request(user:string,password:string):Promise<{ticket:string;state:string;retentionDays:number}>;
}
