/**
 * Urutan nomor kaveling. 12A adalah pengganti nomor 13 (dihindari menurut
 * kepercayaan Tionghoa), jadi letaknya di antara 12 dan 14.
 */
export const compareLotNumber = (a: string, b: string) => a.localeCompare(b, 'id', { numeric: true })
