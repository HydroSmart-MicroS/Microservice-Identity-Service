import {passwordError,validText} from '../../domain/model/valueobjects/AccountValidation.js';
export class InputError extends Error {constructor(message:string,public status=400){super(message);}}
export function validatePhoto(image:unknown):void {
  if(image===null)return;
  if(typeof image!=='string'||image.length>350000||!/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(image))throw new InputError('La foto debe ser PNG y ocupar como máximo 256 KB.');
  const data=Buffer.from(image.slice(22),'base64');
  if(data.length>262144||data.length<45||data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||data.subarray(12,16).toString()!=='IHDR'||data.subarray(-8,-4).toString()!=='IEND')throw new InputError('El archivo de foto no es un PNG válido.');
  const width=data.readUInt32BE(16),height=data.readUInt32BE(20);
  if(width<1||height<1||width>512||height>512)throw new InputError('La foto debe medir como máximo 512 × 512 píxeles.');
}
export function validateAuthInput(path:string,body:Record<string,unknown>):void {
  if(path==='/sign-up/email'||path==='/sign-in/email'){
    if(!validText(body.email,3,254)||!/^\S+@[^\s@]+\.[^\s@]+$/.test(body.email))throw new InputError('Ingresa un correo válido de hasta 254 caracteres.');
    body.email=body.email.trim();
  }
  if(path==='/sign-up/email'||path==='/update-user'){
    if(path==='/sign-up/email'||Object.hasOwn(body,'name')){
      if(!validText(body.name,2,120))throw new InputError('El nombre debe tener entre 2 y 120 caracteres y no contener caracteres de control.');
      body.name=body.name.trim();
    }
    if(Object.hasOwn(body,'image'))validatePhoto(body.image);
  }
  if(path==='/update-user'&&Object.keys(body).some(key=>!['name','image'].includes(key)))throw new InputError('Solo puedes actualizar tu nombre y foto desde el perfil.');
  if(path==='/sign-up/email'&&body.profileType!==undefined&&!['propietario','inquilino'].includes(body.profileType as string))throw new InputError('Elige propietario o inquilino.',422);
  if(path==='/sign-up/email'||path==='/change-password'||path==='/reset-password'){
    const password=path==='/sign-up/email'?body.password:body.newPassword,error=passwordError(password);
    if(error)throw new InputError(error);
    if(body.confirmPassword!==password)throw new InputError('Las contraseñas no coinciden. Repite la nueva contraseña.');
    delete body.confirmPassword;
  }
  if(path==='/sign-in/email'||path==='/change-password'){
    const current=path==='/sign-in/email'?body.password:body.currentPassword;
    if(typeof current!=='string'||current.length<1||current.length>128)throw new InputError('Ingresa tu contraseña actual (máximo 128 caracteres).');
  }
  if(path==='/change-password')body.revokeOtherSessions=true;
}
