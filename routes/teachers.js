const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../lib/db");
const { requireRole } = require("../lib/auth");
const router=express.Router();
function genPassword(){const c="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let o="";for(let i=0;i<6;i++)o+=c[Math.floor(Math.random()*c.length)];return o;}
function publicTeacher(t){const{passwordHash,...rest}=t;return rest;}
function validPhoto(p){return !p||(typeof p==="string"&&/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(p)&&p.length<=450000);}
router.get("/",requireRole("admin"),(req,res)=>{const d=db.load();res.json({teachers:d.teachers.map(publicTeacher)});});
router.post("/",requireRole("admin"),(req,res)=>{const{name,phone,subject,className,photo}=req.body;if(!name||!phone)return res.status(400).json({error:"name and phone are required"});if(!validPhoto(photo))return res.status(400).json({error:"Invalid or oversized photo"});const d=db.load();if(d.teachers.some(t=>t.phone===phone))return res.status(400).json({error:"A teacher with this phone number already exists"});const password=genPassword();const t={id:db.nextId(d),name:name.trim(),phone,subject:subject||"",className:className||"",photo:photo||"",passwordHash:bcrypt.hashSync(password,10),createdAt:new Date().toISOString()};d.teachers.push(t);db.save(d);res.json({teacher:publicTeacher(t),credentials:{phone,password}});});
router.put("/:id",requireRole("admin"),(req,res)=>{const d=db.load(),t=d.teachers.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:"Teacher not found"});if(req.body.photo!==undefined&&!validPhoto(req.body.photo))return res.status(400).json({error:"Invalid photo"});for(const k of ["name","phone","subject","className","photo"])if(req.body[k]!==undefined)t[k]=req.body[k];db.save(d);res.json({teacher:publicTeacher(t)});});
router.delete("/:id",requireRole("admin"),(req,res)=>{const d=db.load(),before=d.teachers.length;d.teachers=d.teachers.filter(x=>x.id!==req.params.id);if(before===d.teachers.length)return res.status(404).json({error:"Teacher not found"});db.save(d);res.json({ok:true});});
router.post("/:id/reset-password",requireRole("admin"),(req,res)=>{const d=db.load(),t=d.teachers.find(x=>x.id===req.params.id);if(!t)return res.status(404).json({error:"Teacher not found"});const p=genPassword();t.passwordHash=bcrypt.hashSync(p,10);db.save(d);res.json({phone:t.phone,newPassword:p});});
module.exports=router;
