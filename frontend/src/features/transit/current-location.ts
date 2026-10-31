/** Retry unavailable GPS with the device network provider; never fabricate a location. */
export async function currentLocation():Promise<GeolocationPosition> {
  if(!navigator.geolocation)throw new Error('Brauzer məkan xidmətini dəstəkləmir. Başlanğıcı xəritədən seçin.');
  const read=(highAccuracy:boolean)=>new Promise<GeolocationPosition>((resolve,reject)=>
    navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:highAccuracy,maximumAge:15000,timeout:highAccuracy?8000:12000}));
  try {
    let fix:GeolocationPosition;
    try {fix=await read(true);} catch(error) {
      if((error as GeolocationPositionError).code===1)throw error;
      fix=await read(false);
    }
    if(Date.now()-fix.timestamp>30000||![fix.coords.latitude,fix.coords.longitude,fix.coords.accuracy].every(Number.isFinite))
      throw new Error('Aktual mövqe alınmadı. Yenidən yoxlayın və ya başlanğıcı xəritədən seçin.');
    return fix;
  } catch(error) {
    const code=(error as GeolocationPositionError).code;
    if(code===1)throw new Error('Bu sayt üçün məkan bloklanıb. Brauzerdə cari ünvanın icazəsini və Windows məkan xidmətini yoxlayın (localhost və 127.0.0.1 ayrı saytlardır).');
    if(code===3)throw new Error('Məkan sorğusunun vaxtı bitdi; bu, icazə xətası deyil. Yenidən yoxlayın və ya başlanğıcı xəritədən seçin.');
    if(code===2)throw new Error('Cihaz mövqeyi müəyyən edə bilmədi. Windows məkan xidmətini və şəbəkə bağlantısını yoxlayın və ya başlanğıcı xəritədən seçin.');
    throw error;
  }
}
