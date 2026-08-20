fn main() {
  // 确保前端资源变化时触发重新编译
  println!("cargo:rerun-if-changed=../dist");
  tauri_build::build()
}
