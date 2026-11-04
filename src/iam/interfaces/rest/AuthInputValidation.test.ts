import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAuthInput,validatePhoto} from './AuthInputValidation.js';
test('registration requires a strong matching password and bounded name/email',()=>{
  const input={name:'Mateo Lima',email:'mateo@example.com',password:'UnaClaveValida12!',confirmPassword:'UnaClaveValida12!'};
  validateAuthInput('/sign-up/email',{...input});
  for(const invalid of [{password:'aaaaaaaaaaaa'},{confirmPassword:'OtraClave12!'},{name:' '.repeat(3)},{name:'a'.repeat(121)},{email:'a'.repeat(255)+'@x.pe'},{password:'Aa1!'.repeat(33)}])assert.throws(()=>validateAuthInput('/sign-up/email',{...input,...invalid}));
});
test('profile rejects role changes, control characters and remote or SVG photos',()=>{
  for(const input of [{profileType:'propietario'},{name:'Mal\u0000nombre'},{image:'https://example.com/tracker.png'},{image:'data:image/svg+xml;base64,PHN2Zz4='}])assert.throws(()=>validateAuthInput('/update-user',input));
  const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1kAAAAASUVORK5CYII=';
  validatePhoto(pixel);validatePhoto(null);
});
test('changing password requires confirmation and revokes other sessions',()=>{
  const body={currentPassword:'old-password',newPassword:'NuevaClaveLarga12!',confirmPassword:'NuevaClaveLarga12!',revokeOtherSessions:false};
  validateAuthInput('/change-password',body);assert.equal(body.revokeOtherSessions,true);assert.equal(Object.hasOwn(body,'confirmPassword'),false);
  assert.throws(()=>validateAuthInput('/change-password',{...body,currentPassword:'x'.repeat(129)}));
});
