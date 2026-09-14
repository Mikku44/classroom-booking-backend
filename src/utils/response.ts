import { Response } from 'express';
export const ok=(res:Response,data:unknown,message='Success',meta?:unknown)=>res.json({success:true,message,data,...(meta?{meta}:{})});
export const created=(res:Response,data:unknown,message='Created')=>res.status(201).json({success:true,message,data});
