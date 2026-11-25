// Saves the PDF in the app's cache folder and opens the system share sheet.
// Android only: the iOS build leaves the Filesystem plugin out.

export async function sharePdf(bytes: Uint8Array, fileName: string, title: string): Promise<void> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  const data = btoa(binary);
  const res = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
  await Share.share({ title, files: [res.uri], dialogTitle: title });
}
