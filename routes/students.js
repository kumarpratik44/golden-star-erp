const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../lib/db");
const { requireRole } = require("../lib/auth");

const router = express.Router();
function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = ""; for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function genAdmissionNo(data, admissionYear) {
  const year = Number(admissionYear) || new Date().getFullYear();
  const used = new Set(data.students.map(s => String(s.admissionNo || "")));
  let n = 1, id;
  do { id = `GS${year}${String(n++).padStart(4, "0")}`; } while (used.has(id));
  return id;
}
function publicStudent(s) { const { passwordHash, parentPasswordHash, ...rest } = s; return rest; }
function validPhoto(photo) { return !photo || (typeof photo === "string" && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(photo) && photo.length <= 450000); }

router.get("/mine", requireRole("student"), (req,res)=>{
  const data=db.load(), student=data.students.find(s=>s.id===req.session.user.id);
  if(!student) return res.status(404).json({error:"Student not found"}); res.json({student:publicStudent(student)});
});
router.get("/parent", requireRole("parent"), (req,res)=>{
  const data=db.load(), student=data.students.find(s=>s.id===req.session.user.studentId);
  if(!student) return res.status(404).json({error:"Student not found"}); res.json({student:publicStudent(student)});
});
router.get("/", requireRole("admin","teacher"), (req,res)=>{
  const data=db.load(); let list=data.students;
  if(req.session.user.role==="teacher") { const t=data.teachers.find(x=>x.id===req.session.user.id); if(t?.className) list=list.filter(s=>String(s.className).trim()===String(t.className).trim()); }
  res.json({students:list.map(publicStudent)});
});
router.post("/", requireRole("admin"),(req,res)=>{
  const {name,className,section,dob,admissionYear,gender,address,parentName,parentPhone,parentEmail,photo}=req.body;
  if(!name||!className) return res.status(400).json({error:"name and className are required"});
  if(!validPhoto(photo)) return res.status(400).json({error:"Photo is invalid or too large. Please use JPG/PNG/WebP under about 300 KB."});
  const data=db.load(), year=Number(admissionYear)||new Date().getFullYear(), admissionNo=genAdmissionNo(data,year);
  const studentPassword=genPassword(), parentPassword=genPassword();
  const student={id:db.nextId(data),admissionNo,name:name.trim(),className:String(className).trim(),section:section||"A",dob:dob||"",admissionYear:year,gender:gender||"",address:address||"",parentName:parentName||"",parentPhone:parentPhone||"",parentEmail:parentEmail||"",photo:photo||"",passwordHash:bcrypt.hashSync(studentPassword,10),parentPasswordHash:bcrypt.hashSync(parentPassword,10),createdAt:new Date().toISOString()};
  data.students.push(student); db.save(data);
  res.json({student:publicStudent(student),credentials:{studentLogin:{admissionNo,password:studentPassword},parentLogin:{admissionNo,password:parentPassword}}});
});
router.put("/:id", requireRole("admin"),(req,res)=>{
  const data=db.load(), student=data.students.find(s=>s.id===req.params.id); if(!student) return res.status(404).json({error:"Student not found"});
  const editable=["name","className","section","dob","gender","address","parentName","parentPhone","parentEmail","photo"];
  if(req.body.photo!==undefined && !validPhoto(req.body.photo)) return res.status(400).json({error:"Invalid photo"});
  for(const key of editable) if(req.body[key]!==undefined) student[key]=req.body[key];
  db.save(data); res.json({student:publicStudent(student)});
});
router.delete("/:id", requireRole("admin"),(req,res)=>{ const data=db.load(),before=data.students.length; data.students=data.students.filter(s=>s.id!==req.params.id); if(data.students.length===before)return res.status(404).json({error:"Student not found"}); db.save(data); res.json({ok:true}); });
router.post("/:id/reset-password", requireRole("admin"),(req,res)=>{ const {target}=req.body,data=db.load(),student=data.students.find(s=>s.id===req.params.id); if(!student)return res.status(404).json({error:"Student not found"}); const p=genPassword(); if(target==="parent")student.parentPasswordHash=bcrypt.hashSync(p,10);else student.passwordHash=bcrypt.hashSync(p,10);db.save(data);res.json({admissionNo:student.admissionNo,target:target==="parent"?"parent":"student",newPassword:p}); });
module.exports=router;
