Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)

If Not fso.FileExists(root & "\node_modules\electron\dist\electron.exe") Then
  MsgBox "Electron is missing. Run npm install in the project folder first.", 16, "Life Sidequest"
  WScript.Quit
End If

If Not fso.FileExists(root & "\.next\BUILD_ID") Then
  MsgBox "The panel is not built yet. Run npm run build first.", 16, "Life Sidequest"
  WScript.Quit
End If

sh.CurrentDirectory = root
sh.Run "node desktop\launch.mjs", 0, False
