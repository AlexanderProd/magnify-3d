import * as THREE from "three";
// import MagnifyingShaderFrag from './shaders/MagnifyingShaderFrag.glsl';
// import MagnifyingShaderVert from './shaders/MagnifyingShaderVert.glsl';
// import FXAAShaderFrag from './shaders/FXAAShaderFrag.glsl';
// import FXAAShaderVert from './shaders/FXAAShaderVert.glsl';

let MagnifyingShaderFrag = `#define AA_RANGE 2.0\n
precision mediump float;\n
uniform sampler2D zoomedTexture;\n
uniform sampler2D originalTexture;\n
uniform vec2 pos;\n
uniform vec2 resolution;\n
uniform vec2 mag_resolution;\n
uniform float zoom;\n
uniform float exp;\n
uniform float radius;\n
uniform float outlineThickness;\n
uniform vec3 outlineColor;\n
void main() {\n
vec2 uv = gl_FragCoord.xy / mag_resolution.xy;\n
vec2 pos_uv = pos.xy / mag_resolution.xy;\n
float dist = distance(gl_FragCoord.xy, pos.xy);\n
float z;\n
vec2 p;\n
if (dist < radius) {\n
// https://www.wolframalpha.com/input/?i=plot+1.0+-+(pow(x+%2F+r,+e)+*+(1.0+-+(1.0+%2F+(z))))\n
z = 1.0 - (pow(dist / radius, exp) * (1.0 - (1.0 / (zoom))));\n
p = ((uv - pos_uv) / z) + pos_uv;\n
gl_FragColor = vec4(vec3(texture2D(zoomedTexture, p)), 1.0);\n
} else if (dist <= radius + outlineThickness) {\n
float w = outlineThickness / 2.0;\n
float alpha = smoothstep(0.0, AA_RANGE, dist - radius) - smoothstep(outlineThickness - AA_RANGE, outlineThickness, dist - radius);\n
if (dist <= radius + outlineThickness / 2.0) {\n
// Inside outline.\n
gl_FragColor = mix(texture2D(zoomedTexture, uv), vec4(outlineColor, 1.0), alpha);\n
} else {\n
// Outside outline.\n
gl_FragColor = mix(texture2D(originalTexture, gl_FragCoord.xy / resolution.xy), vec4(outlineColor, 1.0), alpha);\n
}\n
} else {\n
gl_FragColor = texture2D(originalTexture, gl_FragCoord.xy / resolution.xy);\n
}\n
}\n`;

let MagnifyingShaderVert = `void main() {\n
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n
    }\n`;
let FXAAShaderFrag = `precision highp float;\n
uniform sampler2D tDiffuse;\n
uniform vec2 resolution;\n
varying vec2 vUv;\n
// FXAA 3.11 implementation by NVIDIA, ported to WebGL by Agost Biro (biro@archilogic.com)\n
//----------------------------------------------------------------------------------\n
// File:        es3-kepler\\FXAA\\assets\\shaders/FXAA_DefaultES.frag\n
// SDK Version: v3.00\n
// Email:       gameworks@nvidia.com\n
// Site:        http://developer.nvidia.com/\n
//\n
// Copyright (c) 2014-2015, NVIDIA CORPORATION. All rights reserved.\n
//\n
// Redistribution and use in source and binary forms, with or without\n
// modification, are permitted provided that the following conditions\n
// are met:\n
//  * Redistributions of source code must retain the above copyright\n
//    notice, this list of conditions and the following disclaimer.\n
//  * Redistributions in binary form must reproduce the above copyright\n
//    notice, this list of conditions and the following disclaimer in the\n
//    documentation and/or other materials provided with the distribution.\n
//  * Neither the name of NVIDIA CORPORATION nor the names of its\n
//    contributors may be used to endorse or promote products derived\n
//    from this software without specific prior written permission.\n
//\n
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS \`\`AS IS'' AND ANY\n
// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\n
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR\n
// PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR\n
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,\n
// EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,\n
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR\n
// PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY\n
// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n
//\n
//----------------------------------------------------------------------------------\n
#define FXAA_PC 1\n
#define FXAA_GLSL_100 1\n
#define FXAA_QUALITY_PRESET 12\n
#define FXAA_GREEN_AS_LUMA 1\n
/*--------------------------------------------------------------------------*/\n
#ifndef FXAA_PC_CONSOLE\n
//\n
// The console algorithm for PC is included\n
// for developers targeting really low spec machines.\n
// Likely better to just run FXAA_PC, and use a really low preset.\n
//\n
#define FXAA_PC_CONSOLE 0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#ifndef FXAA_GLSL_120\n
#define FXAA_GLSL_120 0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#ifndef FXAA_GLSL_130\n
#define FXAA_GLSL_130 0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#ifndef FXAA_HLSL_3\n
#define FXAA_HLSL_3 0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#ifndef FXAA_HLSL_4\n
#define FXAA_HLSL_4 0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#ifndef FXAA_HLSL_5\n
#define FXAA_HLSL_5 0\n
#endif\n
/*==========================================================================*/\n
#ifndef FXAA_GREEN_AS_LUMA\n
//\n
// For those using non-linear color,\n
// and either not able to get luma in alpha, or not wanting to,\n
// this enables FXAA to run using green as a proxy for luma.\n
// So with this enabled, no need to pack luma in alpha.\n
//\n
// This will turn off AA on anything which lacks some amount of green.\n
// Pure red and blue or combination of only R and B, will get no AA.\n
//\n
// Might want to lower the settings for both,\n
//    fxaaConsoleEdgeThresholdMin\n
//    fxaaQualityEdgeThresholdMin\n
// In order to insure AA does not get turned off on colors\n
// which contain a minor amount of green.\n
//\n
// 1 = On.\n
// 0 = Off.\n
//\n
#define FXAA_GREEN_AS_LUMA 0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#ifndef FXAA_EARLY_EXIT\n
//\n
// Controls algorithm's early exit path.\n
// On PS3 turning this ON adds 2 cycles to the shader.\n
// On 360 turning this OFF adds 10ths of a millisecond to the shader.\n
// Turning this off on console will result in a more blurry image.\n
// So this defaults to on.\n
//\n
// 1 = On.\n
// 0 = Off.\n
//\n
#define FXAA_EARLY_EXIT 1\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#ifndef FXAA_DISCARD\n
//\n
// Only valid for PC OpenGL currently.\n
// Probably will not work when FXAA_GREEN_AS_LUMA = 1.\n
//\n
// 1 = Use discard on pixels which don't need AA.\n
//     For APIs which enable concurrent TEX+ROP from same surface.\n
// 0 = Return unchanged color on pixels which don't need AA.\n
//\n
#define FXAA_DISCARD 0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#ifndef FXAA_FAST_PIXEL_OFFSET\n
//\n
// Used for GLSL 120 only.\n
//\n
// 1 = GL API supports fast pixel offsets\n
// 0 = do not use fast pixel offsets\n
//\n
#ifdef GL_EXT_gpu_shader4\n
#define FXAA_FAST_PIXEL_OFFSET 1\n
#endif\n
#ifdef GL_NV_gpu_shader5\n
#define FXAA_FAST_PIXEL_OFFSET 1\n
#endif\n
#ifdef GL_ARB_gpu_shader5\n
#define FXAA_FAST_PIXEL_OFFSET 1\n
#endif\n
#ifndef FXAA_FAST_PIXEL_OFFSET\n
#define FXAA_FAST_PIXEL_OFFSET 0\n
#endif\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#ifndef FXAA_GATHER4_ALPHA\n
//\n
// 1 = API supports gather4 on alpha channel.\n
// 0 = API does not support gather4 on alpha channel.\n
//\n
#if (FXAA_HLSL_5 == 1)\n
#define FXAA_GATHER4_ALPHA 1\n
#endif\n
#ifdef GL_ARB_gpu_shader5\n
#define FXAA_GATHER4_ALPHA 1\n
#endif\n
#ifdef GL_NV_gpu_shader5\n
#define FXAA_GATHER4_ALPHA 1\n
#endif\n
#ifndef FXAA_GATHER4_ALPHA\n
#define FXAA_GATHER4_ALPHA 0\n
#endif\n
#endif\n
/*============================================================================\n
FXAA QUALITY - TUNING KNOBS\n
------------------------------------------------------------------------------\n
NOTE the other tuning knobs are now in the shader function inputs!\n
============================================================================*/\n
#ifndef FXAA_QUALITY_PRESET\n
//\n
// Choose the quality preset.\n
// This needs to be compiled into the shader as it effects code.\n
// Best option to include multiple presets is to\n
// in each shader define the preset, then include this file.\n
//\n
// OPTIONS\n
// -----------------------------------------------------------------------\n
// 10 to 15 - default medium dither (10=fastest, 15=highest quality)\n
// 20 to 29 - less dither, more expensive (20=fastest, 29=highest quality)\n
// 39       - no dither, very expensive\n
//\n
// NOTES\n
// -----------------------------------------------------------------------\n
// 12 = slightly faster then FXAA 3.9 and higher edge quality (default)\n
// 13 = about same speed as FXAA 3.9 and better than 12\n
// 23 = closest to FXAA 3.9 visually and performance wise\n
//  _ = the lowest digit is directly related to performance\n
// _  = the highest digit is directly related to style\n
//\n
#define FXAA_QUALITY_PRESET 12\n
#endif\n
/*============================================================================\n
FXAA QUALITY - PRESETS\n
============================================================================*/\n
/*============================================================================\n
FXAA QUALITY - MEDIUM DITHER PRESETS\n
============================================================================*/\n
#if (FXAA_QUALITY_PRESET == 10)\n
#define FXAA_QUALITY_PS 3\n
#define FXAA_QUALITY_P0 1.5\n
#define FXAA_QUALITY_P1 3.0\n
#define FXAA_QUALITY_P2 12.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 11)\n
#define FXAA_QUALITY_PS 4\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 3.0\n
#define FXAA_QUALITY_P3 12.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 12)\n
#define FXAA_QUALITY_PS 5\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 4.0\n
#define FXAA_QUALITY_P4 12.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 13)\n
#define FXAA_QUALITY_PS 6\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 2.0\n
#define FXAA_QUALITY_P4 4.0\n
#define FXAA_QUALITY_P5 12.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 14)\n
#define FXAA_QUALITY_PS 7\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 2.0\n
#define FXAA_QUALITY_P4 2.0\n
#define FXAA_QUALITY_P5 4.0\n
#define FXAA_QUALITY_P6 12.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 15)\n
#define FXAA_QUALITY_PS 8\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 2.0\n
#define FXAA_QUALITY_P4 2.0\n
#define FXAA_QUALITY_P5 2.0\n
#define FXAA_QUALITY_P6 4.0\n
#define FXAA_QUALITY_P7 12.0\n
#endif\n
/*============================================================================\n
FXAA QUALITY - LOW DITHER PRESETS\n
============================================================================*/\n
#if (FXAA_QUALITY_PRESET == 20)\n
#define FXAA_QUALITY_PS 3\n
#define FXAA_QUALITY_P0 1.5\n
#define FXAA_QUALITY_P1 2.0\n
#define FXAA_QUALITY_P2 8.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 21)\n
#define FXAA_QUALITY_PS 4\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 8.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 22)\n
#define FXAA_QUALITY_PS 5\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 2.0\n
#define FXAA_QUALITY_P4 8.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 23)\n
#define FXAA_QUALITY_PS 6\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 2.0\n
#define FXAA_QUALITY_P4 2.0\n
#define FXAA_QUALITY_P5 8.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 24)\n
#define FXAA_QUALITY_PS 7\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 2.0\n
#define FXAA_QUALITY_P4 2.0\n
#define FXAA_QUALITY_P5 3.0\n
#define FXAA_QUALITY_P6 8.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 25)\n
#define FXAA_QUALITY_PS 8\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 2.0\n
#define FXAA_QUALITY_P4 2.0\n
#define FXAA_QUALITY_P5 2.0\n
#define FXAA_QUALITY_P6 4.0\n
#define FXAA_QUALITY_P7 8.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 26)\n
#define FXAA_QUALITY_PS 9\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 2.0\n
#define FXAA_QUALITY_P4 2.0\n
#define FXAA_QUALITY_P5 2.0\n
#define FXAA_QUALITY_P6 2.0\n
#define FXAA_QUALITY_P7 4.0\n
#define FXAA_QUALITY_P8 8.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 27)\n
#define FXAA_QUALITY_PS 10\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 2.0\n
#define FXAA_QUALITY_P4 2.0\n
#define FXAA_QUALITY_P5 2.0\n
#define FXAA_QUALITY_P6 2.0\n
#define FXAA_QUALITY_P7 2.0\n
#define FXAA_QUALITY_P8 4.0\n
#define FXAA_QUALITY_P9 8.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 28)\n
#define FXAA_QUALITY_PS 11\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 2.0\n
#define FXAA_QUALITY_P4 2.0\n
#define FXAA_QUALITY_P5 2.0\n
#define FXAA_QUALITY_P6 2.0\n
#define FXAA_QUALITY_P7 2.0\n
#define FXAA_QUALITY_P8 2.0\n
#define FXAA_QUALITY_P9 4.0\n
#define FXAA_QUALITY_P10 8.0\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PRESET == 29)\n
#define FXAA_QUALITY_PS 12\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.5\n
#define FXAA_QUALITY_P2 2.0\n
#define FXAA_QUALITY_P3 2.0\n
#define FXAA_QUALITY_P4 2.0\n
#define FXAA_QUALITY_P5 2.0\n
#define FXAA_QUALITY_P6 2.0\n
#define FXAA_QUALITY_P7 2.0\n
#define FXAA_QUALITY_P8 2.0\n
#define FXAA_QUALITY_P9 2.0\n
#define FXAA_QUALITY_P10 4.0\n
#define FXAA_QUALITY_P11 8.0\n
#endif\n
/*============================================================================\n
FXAA QUALITY - EXTREME QUALITY\n
============================================================================*/\n
#if (FXAA_QUALITY_PRESET == 39)\n
#define FXAA_QUALITY_PS 12\n
#define FXAA_QUALITY_P0 1.0\n
#define FXAA_QUALITY_P1 1.0\n
#define FXAA_QUALITY_P2 1.0\n
#define FXAA_QUALITY_P3 1.0\n
#define FXAA_QUALITY_P4 1.0\n
#define FXAA_QUALITY_P5 1.5\n
#define FXAA_QUALITY_P6 2.0\n
#define FXAA_QUALITY_P7 2.0\n
#define FXAA_QUALITY_P8 2.0\n
#define FXAA_QUALITY_P9 2.0\n
#define FXAA_QUALITY_P10 4.0\n
#define FXAA_QUALITY_P11 8.0\n
#endif\n
/*============================================================================\n
API PORTING\n
============================================================================*/\n
#if (FXAA_GLSL_100 == 1) || (FXAA_GLSL_120 == 1) || (FXAA_GLSL_130 == 1)\n
#define FxaaBool bool\n
#define FxaaDiscard discard\n
#define FxaaFloat float\n
#define FxaaFloat2 vec2\n
#define FxaaFloat3 vec3\n
#define FxaaFloat4 vec4\n
#define FxaaHalf float\n
#define FxaaHalf2 vec2\n
#define FxaaHalf3 vec3\n
#define FxaaHalf4 vec4\n
#define FxaaInt2 ivec2\n
#define FxaaSat(x) clamp(x, 0.0, 1.0)\n
#define FxaaTex sampler2D\n
#else\n
#define FxaaBool bool\n
#define FxaaDiscard clip(-1)\n
#define FxaaFloat float\n
#define FxaaFloat2 float2\n
#define FxaaFloat3 float3\n
#define FxaaFloat4 float4\n
#define FxaaHalf half\n
#define FxaaHalf2 half2\n
#define FxaaHalf3 half3\n
#define FxaaHalf4 half4\n
#define FxaaSat(x) saturate(x)\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_GLSL_100 == 1)\n
#define FxaaTexTop(t, p) texture2D(t, p, 0.0)\n
#define FxaaTexOff(t, p, o, r) texture2D(t, p + (o * r), 0.0)\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_GLSL_120 == 1)\n
// Requires,\n
//  #version 120\n
// And at least,\n
//  #extension GL_EXT_gpu_shader4 : enable\n
//  (or set FXAA_FAST_PIXEL_OFFSET 1 to work like DX9)\n
#define FxaaTexTop(t, p) texture2DLod(t, p, 0.0)\n
#if (FXAA_FAST_PIXEL_OFFSET == 1)\n
#define FxaaTexOff(t, p, o, r) texture2DLodOffset(t, p, 0.0, o)\n
#else\n
#define FxaaTexOff(t, p, o, r) texture2DLod(t, p + (o * r), 0.0)\n
#endif\n
#if (FXAA_GATHER4_ALPHA == 1)\n
// use #extension GL_ARB_gpu_shader5 : enable\n
#define FxaaTexAlpha4(t, p) textureGather(t, p, 3)\n
#define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)\n
#define FxaaTexGreen4(t, p) textureGather(t, p, 1)\n
#define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)\n
#endif\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_GLSL_130 == 1)\n
// Requires \\#version 130\\ or better\n
#define FxaaTexTop(t, p) textureLod(t, p, 0.0)\n
#define FxaaTexOff(t, p, o, r) textureLodOffset(t, p, 0.0, o)\n
#if (FXAA_GATHER4_ALPHA == 1)\n
// use #extension GL_ARB_gpu_shader5 : enable\n
#define FxaaTexAlpha4(t, p) textureGather(t, p, 3)\n
#define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)\n
#define FxaaTexGreen4(t, p) textureGather(t, p, 1)\n
#define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)\n
#endif\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_HLSL_3 == 1)\n
#define FxaaInt2 float2\n
#define FxaaTex sampler2D\n
#define FxaaTexTop(t, p) tex2Dlod(t, float4(p, 0.0, 0.0))\n
#define FxaaTexOff(t, p, o, r) tex2Dlod(t, float4(p + (o * r), 0, 0))\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_HLSL_4 == 1)\n
#define FxaaInt2 int2\n
struct FxaaTex { SamplerState smpl; Texture2D tex; };\n
#define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)\n
#define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_HLSL_5 == 1)\n
#define FxaaInt2 int2\n
struct FxaaTex { SamplerState smpl; Texture2D tex; };\n
#define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)\n
#define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)\n
#define FxaaTexAlpha4(t, p) t.tex.GatherAlpha(t.smpl, p)\n
#define FxaaTexOffAlpha4(t, p, o) t.tex.GatherAlpha(t.smpl, p, o)\n
#define FxaaTexGreen4(t, p) t.tex.GatherGreen(t.smpl, p)\n
#define FxaaTexOffGreen4(t, p, o) t.tex.GatherGreen(t.smpl, p, o)\n
#endif\n
/*============================================================================\n
GREEN AS LUMA OPTION SUPPORT FUNCTION\n
============================================================================*/\n
#if (FXAA_GREEN_AS_LUMA == 0)\n
FxaaFloat FxaaLuma(FxaaFloat4 rgba) { return rgba.w; }\n
#else\n
FxaaFloat FxaaLuma(FxaaFloat4 rgba) { return rgba.y; }\n
#endif\n
/*============================================================================\n
FXAA3 QUALITY - PC\n
============================================================================*/\n
#if (FXAA_PC == 1)\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat4 FxaaPixelShader(\n
//\n
// Use noperspective interpolation here (turn off perspective interpolation).\n
// {xy} = center of pixel\n
FxaaFloat2 pos,\n
//\n
// Used only for FXAA Console, and not used on the 360 version.\n
// Use noperspective interpolation here (turn off perspective interpolation).\n
// {xy_} = upper left of pixel\n
// {_zw} = lower right of pixel\n
FxaaFloat4 fxaaConsolePosPos,\n
//\n
// Input color texture.\n
// {rgb_} = color in linear or perceptual color space\n
// if (FXAA_GREEN_AS_LUMA == 0)\n
//     {__a} = luma in perceptual color space (not linear)\n
FxaaTex tex,\n
//\n
// Only used on the optimized 360 version of FXAA Console.\n
// For everything but 360, just use the same input here as for \\tex\\.\n
// For 360, same texture, just alias with a 2nd sampler.\n
// This sampler needs to have an exponent bias of -1.\n
FxaaTex fxaaConsole360TexExpBiasNegOne,\n
//\n
// Only used on the optimized 360 version of FXAA Console.\n
// For everything but 360, just use the same input here as for \\tex\\.\n
// For 360, same texture, just alias with a 3nd sampler.\n
// This sampler needs to have an exponent bias of -2.\n
FxaaTex fxaaConsole360TexExpBiasNegTwo,\n
//\n
// Only used on FXAA Quality.\n
// This must be from a constant/uniform.\n
// {x_} = 1.0/screenWidthInPixels\n
// {_y} = 1.0/screenHeightInPixels\n
FxaaFloat2 fxaaQualityRcpFrame,\n
//\n
// Only used on FXAA Console.\n
// This must be from a constant/uniform.\n
// This effects sub-pixel AA quality and inversely sharpness.\n
//   Where N ranges between,\n
//     N = 0.50 (default)\n
//     N = 0.33 (sharper)\n
// {x__} = -N/screenWidthInPixels\n
// {_y_} = -N/screenHeightInPixels\n
// {_z_} =  N/screenWidthInPixels\n
// {__w} =  N/screenHeightInPixels\n
FxaaFloat4 fxaaConsoleRcpFrameOpt,\n
//\n
// Only used on FXAA Console.\n
// Not used on 360, but used on PS3 and PC.\n
// This must be from a constant/uniform.\n
// {x__} = -2.0/screenWidthInPixels\n
// {_y_} = -2.0/screenHeightInPixels\n
// {_z_} =  2.0/screenWidthInPixels\n
// {__w} =  2.0/screenHeightInPixels\n
FxaaFloat4 fxaaConsoleRcpFrameOpt2,\n
//\n
// Only used on FXAA Console.\n
// Only used on 360 in place of fxaaConsoleRcpFrameOpt2.\n
// This must be from a constant/uniform.\n
// {x__} =  8.0/screenWidthInPixels\n
// {_y_} =  8.0/screenHeightInPixels\n
// {_z_} = -4.0/screenWidthInPixels\n
// {__w} = -4.0/screenHeightInPixels\n
FxaaFloat4 fxaaConsole360RcpFrameOpt2,\n
//\n
// Only used on FXAA Quality.\n
// This used to be the FXAA_QUALITY_SUBPIX define.\n
// It is here now to allow easier tuning.\n
// Choose the amount of sub-pixel aliasing removal.\n
// This can effect sharpness.\n
//   1.00 - upper limit (softer)\n
//   0.75 - default amount of filtering\n
//   0.50 - lower limit (sharper, less sub-pixel aliasing removal)\n
//   0.25 - almost off\n
//   0.00 - completely off\n
FxaaFloat fxaaQualitySubpix,\n
//\n
// Only used on FXAA Quality.\n
// This used to be the FXAA_QUALITY_EDGE_THRESHOLD define.\n
// It is here now to allow easier tuning.\n
// The minimum amount of local contrast required to apply algorithm.\n
//   0.333 - too little (faster)\n
//   0.250 - low quality\n
//   0.166 - default\n
//   0.125 - high quality\n
//   0.063 - overkill (slower)\n
FxaaFloat fxaaQualityEdgeThreshold,\n
//\n
// Only used on FXAA Quality.\n
// This used to be the FXAA_QUALITY_EDGE_THRESHOLD_MIN define.\n
// It is here now to allow easier tuning.\n
// Trims the algorithm from processing darks.\n
//   0.0833 - upper limit (default, the start of visible unfiltered edges)\n
//   0.0625 - high quality (faster)\n
//   0.0312 - visible limit (slower)\n
// Special notes when using FXAA_GREEN_AS_LUMA,\n
//   Likely want to set this to zero.\n
//   As colors that are mostly not-green\n
//   will appear very dark in the green channel!\n
//   Tune by looking at mostly non-green content,\n
//   then start at zero and increase until aliasing is a problem.\n
FxaaFloat fxaaQualityEdgeThresholdMin,\n
//\n
// Only used on FXAA Console.\n
// This used to be the FXAA_CONSOLE_EDGE_SHARPNESS define.\n
// It is here now to allow easier tuning.\n
// This does not effect PS3, as this needs to be compiled in.\n
//   Use FXAA_CONSOLE_PS3_EDGE_SHARPNESS for PS3.\n
//   Due to the PS3 being ALU bound,\n
//   there are only three safe values here: 2 and 4 and 8.\n
//   These options use the shaders ability to a free *|/ by 2|4|8.\n
// For all other platforms can be a non-power of two.\n
//   8.0 is sharper (default!!!)\n
//   4.0 is softer\n
//   2.0 is really soft (good only for vector graphics inputs)\n
FxaaFloat fxaaConsoleEdgeSharpness,\n
//\n
// Only used on FXAA Console.\n
// This used to be the FXAA_CONSOLE_EDGE_THRESHOLD define.\n
// It is here now to allow easier tuning.\n
// This does not effect PS3, as this needs to be compiled in.\n
//   Use FXAA_CONSOLE_PS3_EDGE_THRESHOLD for PS3.\n
//   Due to the PS3 being ALU bound,\n
//   there are only two safe values here: 1/4 and 1/8.\n
//   These options use the shaders ability to a free *|/ by 2|4|8.\n
// The console setting has a different mapping than the quality setting.\n
// Other platforms can use other values.\n
//   0.125 leaves less aliasing, but is softer (default!!!)\n
//   0.25 leaves more aliasing, and is sharper\n
FxaaFloat fxaaConsoleEdgeThreshold,\n
//\n
// Only used on FXAA Console.\n
// This used to be the FXAA_CONSOLE_EDGE_THRESHOLD_MIN define.\n
// It is here now to allow easier tuning.\n
// Trims the algorithm from processing darks.\n
// The console setting has a different mapping than the quality setting.\n
// This only applies when FXAA_EARLY_EXIT is 1.\n
// This does not apply to PS3,\n
// PS3 was simplified to avoid more shader instructions.\n
//   0.06 - faster but more aliasing in darks\n
//   0.05 - default\n
//   0.04 - slower and less aliasing in darks\n
// Special notes when using FXAA_GREEN_AS_LUMA,\n
//   Likely want to set this to zero.\n
//   As colors that are mostly not-green\n
//   will appear very dark in the green channel!\n
//   Tune by looking at mostly non-green content,\n
//   then start at zero and increase until aliasing is a problem.\n
FxaaFloat fxaaConsoleEdgeThresholdMin,\n
//\n
// Extra constants for 360 FXAA Console only.\n
// Use zeros or anything else for other platforms.\n
// These must be in physical constant registers and NOT immediates.\n
// Immediates will result in compiler un-optimizing.\n
// {xyzw} = float4(1.0, -1.0, 0.25, -0.25)\n
FxaaFloat4 fxaaConsole360ConstDir\n
) {\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat2 posM;\n
posM.x = pos.x;\n
posM.y = pos.y;\n
#if (FXAA_GATHER4_ALPHA == 1)\n
#if (FXAA_DISCARD == 0)\n
FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);\n
#if (FXAA_GREEN_AS_LUMA == 0)\n
#define lumaM rgbyM.w\n
#else\n
#define lumaM rgbyM.y\n
#endif\n
#endif\n
#if (FXAA_GREEN_AS_LUMA == 0)\n
FxaaFloat4 luma4A = FxaaTexAlpha4(tex, posM);\n
FxaaFloat4 luma4B = FxaaTexOffAlpha4(tex, posM, FxaaInt2(-1, -1));\n
#else\n
FxaaFloat4 luma4A = FxaaTexGreen4(tex, posM);\n
FxaaFloat4 luma4B = FxaaTexOffGreen4(tex, posM, FxaaInt2(-1, -1));\n
#endif\n
#if (FXAA_DISCARD == 1)\n
#define lumaM luma4A.w\n
#endif\n
#define lumaE luma4A.z\n
#define lumaS luma4A.x\n
#define lumaSE luma4A.y\n
#define lumaNW luma4B.w\n
#define lumaN luma4B.z\n
#define lumaW luma4B.x\n
#else\n
FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);\n
#if (FXAA_GREEN_AS_LUMA == 0)\n
#define lumaM rgbyM.w\n
#else\n
#define lumaM rgbyM.y\n
#endif\n
#if (FXAA_GLSL_100 == 1)\n
FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 0.0, 1.0), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0, 0.0), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 0.0,-1.0), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 0.0), fxaaQualityRcpFrame.xy));\n
#else\n
FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0, 1), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 0), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0,-1), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 0), fxaaQualityRcpFrame.xy));\n
#endif\n
#endif\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat maxSM = max(lumaS, lumaM);\n
FxaaFloat minSM = min(lumaS, lumaM);\n
FxaaFloat maxESM = max(lumaE, maxSM);\n
FxaaFloat minESM = min(lumaE, minSM);\n
FxaaFloat maxWN = max(lumaN, lumaW);\n
FxaaFloat minWN = min(lumaN, lumaW);\n
FxaaFloat rangeMax = max(maxWN, maxESM);\n
FxaaFloat rangeMin = min(minWN, minESM);\n
FxaaFloat rangeMaxScaled = rangeMax * fxaaQualityEdgeThreshold;\n
FxaaFloat range = rangeMax - rangeMin;\n
FxaaFloat rangeMaxClamped = max(fxaaQualityEdgeThresholdMin, rangeMaxScaled);\n
FxaaBool earlyExit = range < rangeMaxClamped;\n
/*--------------------------------------------------------------------------*/\n
if(earlyExit)\n
#if (FXAA_DISCARD == 1)\n
FxaaDiscard;\n
#else\n
return rgbyM;\n
#endif\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_GATHER4_ALPHA == 0)\n
#if (FXAA_GLSL_100 == 1)\n
FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0,-1.0), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0, 1.0), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0,-1.0), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 1.0), fxaaQualityRcpFrame.xy));\n
#else\n
FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1,-1), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 1), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1,-1), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));\n
#endif\n
#else\n
FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(1, -1), fxaaQualityRcpFrame.xy));\n
FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));\n
#endif\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat lumaNS = lumaN + lumaS;\n
FxaaFloat lumaWE = lumaW + lumaE;\n
FxaaFloat subpixRcpRange = 1.0/range;\n
FxaaFloat subpixNSWE = lumaNS + lumaWE;\n
FxaaFloat edgeHorz1 = (-2.0 * lumaM) + lumaNS;\n
FxaaFloat edgeVert1 = (-2.0 * lumaM) + lumaWE;\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat lumaNESE = lumaNE + lumaSE;\n
FxaaFloat lumaNWNE = lumaNW + lumaNE;\n
FxaaFloat edgeHorz2 = (-2.0 * lumaE) + lumaNESE;\n
FxaaFloat edgeVert2 = (-2.0 * lumaN) + lumaNWNE;\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat lumaNWSW = lumaNW + lumaSW;\n
FxaaFloat lumaSWSE = lumaSW + lumaSE;\n
FxaaFloat edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);\n
FxaaFloat edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);\n
FxaaFloat edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;\n
FxaaFloat edgeVert3 = (-2.0 * lumaS) + lumaSWSE;\n
FxaaFloat edgeHorz = abs(edgeHorz3) + edgeHorz4;\n
FxaaFloat edgeVert = abs(edgeVert3) + edgeVert4;\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat subpixNWSWNESE = lumaNWSW + lumaNESE;\n
FxaaFloat lengthSign = fxaaQualityRcpFrame.x;\n
FxaaBool horzSpan = edgeHorz >= edgeVert;\n
FxaaFloat subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;\n
/*--------------------------------------------------------------------------*/\n
if(!horzSpan) lumaN = lumaW;\n
if(!horzSpan) lumaS = lumaE;\n
if(horzSpan) lengthSign = fxaaQualityRcpFrame.y;\n
FxaaFloat subpixB = (subpixA * (1.0/12.0)) - lumaM;\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat gradientN = lumaN - lumaM;\n
FxaaFloat gradientS = lumaS - lumaM;\n
FxaaFloat lumaNN = lumaN + lumaM;\n
FxaaFloat lumaSS = lumaS + lumaM;\n
FxaaBool pairN = abs(gradientN) >= abs(gradientS);\n
FxaaFloat gradient = max(abs(gradientN), abs(gradientS));\n
if(pairN) lengthSign = -lengthSign;\n
FxaaFloat subpixC = FxaaSat(abs(subpixB) * subpixRcpRange);\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat2 posB;\n
posB.x = posM.x;\n
posB.y = posM.y;\n
FxaaFloat2 offNP;\n
offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;\n
offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;\n
if(!horzSpan) posB.x += lengthSign * 0.5;\n
if( horzSpan) posB.y += lengthSign * 0.5;\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat2 posN;\n
posN.x = posB.x - offNP.x * FXAA_QUALITY_P0;\n
posN.y = posB.y - offNP.y * FXAA_QUALITY_P0;\n
FxaaFloat2 posP;\n
posP.x = posB.x + offNP.x * FXAA_QUALITY_P0;\n
posP.y = posB.y + offNP.y * FXAA_QUALITY_P0;\n
FxaaFloat subpixD = ((-2.0)*subpixC) + 3.0;\n
FxaaFloat lumaEndN = FxaaLuma(FxaaTexTop(tex, posN));\n
FxaaFloat subpixE = subpixC * subpixC;\n
FxaaFloat lumaEndP = FxaaLuma(FxaaTexTop(tex, posP));\n
/*--------------------------------------------------------------------------*/\n
if(!pairN) lumaNN = lumaSS;\n
FxaaFloat gradientScaled = gradient * 1.0/4.0;\n
FxaaFloat lumaMM = lumaM - lumaNN * 0.5;\n
FxaaFloat subpixF = subpixD * subpixE;\n
FxaaBool lumaMLTZero = lumaMM < 0.0;\n
/*--------------------------------------------------------------------------*/\n
lumaEndN -= lumaNN * 0.5;\n
lumaEndP -= lumaNN * 0.5;\n
FxaaBool doneN = abs(lumaEndN) >= gradientScaled;\n
FxaaBool doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P1;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P1;\n
FxaaBool doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P1;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P1;\n
/*--------------------------------------------------------------------------*/\n
if(doneNP) {\n
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n
doneN = abs(lumaEndN) >= gradientScaled;\n
doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P2;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P2;\n
doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P2;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P2;\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PS > 3)\n
if(doneNP) {\n
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n
doneN = abs(lumaEndN) >= gradientScaled;\n
doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P3;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P3;\n
doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P3;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P3;\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PS > 4)\n
if(doneNP) {\n
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n
doneN = abs(lumaEndN) >= gradientScaled;\n
doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P4;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P4;\n
doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P4;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P4;\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PS > 5)\n
if(doneNP) {\n
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n
doneN = abs(lumaEndN) >= gradientScaled;\n
doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P5;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P5;\n
doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P5;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P5;\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PS > 6)\n
if(doneNP) {\n
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n
doneN = abs(lumaEndN) >= gradientScaled;\n
doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P6;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P6;\n
doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P6;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P6;\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PS > 7)\n
if(doneNP) {\n
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n
doneN = abs(lumaEndN) >= gradientScaled;\n
doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P7;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P7;\n
doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P7;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P7;\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PS > 8)\n
if(doneNP) {\n
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n
doneN = abs(lumaEndN) >= gradientScaled;\n
doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P8;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P8;\n
doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P8;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P8;\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PS > 9)\n
if(doneNP) {\n
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n
doneN = abs(lumaEndN) >= gradientScaled;\n
doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P9;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P9;\n
doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P9;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P9;\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PS > 10)\n
if(doneNP) {\n
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n
doneN = abs(lumaEndN) >= gradientScaled;\n
doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P10;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P10;\n
doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P10;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P10;\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PS > 11)\n
if(doneNP) {\n
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n
doneN = abs(lumaEndN) >= gradientScaled;\n
doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P11;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P11;\n
doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P11;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P11;\n
/*--------------------------------------------------------------------------*/\n
#if (FXAA_QUALITY_PS > 12)\n
if(doneNP) {\n
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n
doneN = abs(lumaEndN) >= gradientScaled;\n
doneP = abs(lumaEndP) >= gradientScaled;\n
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P12;\n
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P12;\n
doneNP = (!doneN) || (!doneP);\n
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P12;\n
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P12;\n
/*--------------------------------------------------------------------------*/\n
}\n
#endif\n
/*--------------------------------------------------------------------------*/\n
}\n
#endif\n
/*--------------------------------------------------------------------------*/\n
}\n
#endif\n
/*--------------------------------------------------------------------------*/\n
}\n
#endif\n
/*--------------------------------------------------------------------------*/\n
}\n
#endif\n
/*--------------------------------------------------------------------------*/\n
}\n
#endif\n
/*--------------------------------------------------------------------------*/\n
}\n
#endif\n
/*--------------------------------------------------------------------------*/\n
}\n
#endif\n
/*--------------------------------------------------------------------------*/\n
}\n
#endif\n
/*--------------------------------------------------------------------------*/\n
}\n
#endif\n
/*--------------------------------------------------------------------------*/\n
}\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat dstN = posM.x - posN.x;\n
FxaaFloat dstP = posP.x - posM.x;\n
if(!horzSpan) dstN = posM.y - posN.y;\n
if(!horzSpan) dstP = posP.y - posM.y;\n
/*--------------------------------------------------------------------------*/\n
FxaaBool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;\n
FxaaFloat spanLength = (dstP + dstN);\n
FxaaBool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;\n
FxaaFloat spanLengthRcp = 1.0/spanLength;\n
/*--------------------------------------------------------------------------*/\n
FxaaBool directionN = dstN < dstP;\n
FxaaFloat dst = min(dstN, dstP);\n
FxaaBool goodSpan = directionN ? goodSpanN : goodSpanP;\n
FxaaFloat subpixG = subpixF * subpixF;\n
FxaaFloat pixelOffset = (dst * (-spanLengthRcp)) + 0.5;\n
FxaaFloat subpixH = subpixG * fxaaQualitySubpix;\n
/*--------------------------------------------------------------------------*/\n
FxaaFloat pixelOffsetGood = goodSpan ? pixelOffset : 0.0;\n
FxaaFloat pixelOffsetSubpix = max(pixelOffsetGood, subpixH);\n
if(!horzSpan) posM.x += pixelOffsetSubpix * lengthSign;\n
if( horzSpan) posM.y += pixelOffsetSubpix * lengthSign;\n
#if (FXAA_DISCARD == 1)\n
return FxaaTexTop(tex, posM);\n
#else\n
return FxaaFloat4(FxaaTexTop(tex, posM).xyz, lumaM);\n
#endif\n
}\n
/*==========================================================================*/\n
#endif\n
void main() {\n
gl_FragColor = FxaaPixelShader(\n
vUv,\n
vec4(0.0),\n
tDiffuse,\n
tDiffuse,\n
tDiffuse,\n
resolution,\n
vec4(0.0),\n
vec4(0.0),\n
vec4(0.0),\n
0.75,\n
0.166,\n
0.0833,\n
0.0,\n
0.0,\n
0.0,\n
vec4(0.0)\n
);\n
// TODO avoid querying texture twice for same texel\n
gl_FragColor.a = texture2D(tDiffuse, vUv).a;\n
}\n`;
let FXAAShaderVert = `varying vec2 vUv;\n
void main() {\n
vUv = uv;\n
gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n
}\n`;

export default class Magnify3d {
  magnifyMaterial: THREE.ShaderMaterial;
  zoomTarget: THREE.WebGLRenderTarget;
  camera: THREE.Camera;
  magnifyScene: THREE.Scene;
  fxaaMaterial: THREE.ShaderMaterial;
  fxaaScene: THREE.Scene;
  fxaaTarget: THREE.WebGLRenderTarget;
  outlineColor: THREE.Color;

  constructor() {
    this.magnifyMaterial = new THREE.ShaderMaterial({
      vertexShader: MagnifyingShaderVert,
      fragmentShader: MagnifyingShaderFrag,
      uniforms: {
        zoomedTexture: { type: "t" },
        originalTexture: { type: "t" },
        pos: { type: "v2" },
        outlineColor: { type: "v3" },
        mag_resolution: { type: "v2" },
        resolution: { type: "v2" },
        zoom: { type: "f" },
        radius: { type: "f" },
        outlineThickness: { type: "f" },
        exp: { type: "f" },
      },
    });

    this.magnifyMaterial.transparent = true; // Needed if inputBuffer is undefined.

    this.magnifyScene = this.createScene(this.magnifyMaterial);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Size is not really matter here. It gets updated inside `render`.
    this.zoomTarget = new THREE.WebGLRenderTarget(0, 0);

    // Antialiasing shader
    this.fxaaMaterial = new THREE.ShaderMaterial({
      vertexShader: FXAAShaderVert,
      fragmentShader: FXAAShaderFrag,
      uniforms: {
        tDiffuse: { type: "t" },
        resolution: { type: "v2" },
      },
    });

    this.fxaaMaterial.transparent = true; // Needed if inputBuffer is undefined.
    this.fxaaScene = this.createScene(this.fxaaMaterial);

    this.fxaaTarget = new THREE.WebGLRenderTarget(0, 0);

    this.outlineColor = new THREE.Color();
  }

  createScene(material: THREE.Material | Array<THREE.Material>) {
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);

    const scene = new THREE.Scene();
    scene.add(quad);

    return scene;
  }

  render({
    renderer,
    renderSceneCB,
    pos = undefined,
    zoom = 2.0,
    exp = 35.0,
    radius = 100.0,
    outlineColor = 0xcccccc,
    outlineThickness = 8.0,
    antialias = true,
    inputBuffer = undefined,
    outputBuffer = undefined,
  }: {
    renderer: THREE.WebGLRenderer;
    renderSceneCB: Function;
    pos?: { x: number; y: number };
    zoom?: number;
    exp?: number;
    radius?: number;
    outlineColor?: number;
    outlineThickness?: number;
    antialias?: boolean;
    inputBuffer?: THREE.WebGLRenderTarget;
    outputBuffer?: THREE.WebGLRenderTarget;
  }) {
    if (!renderer) {
      console.warn("Magnify-3d: No renderer attached!");
      return;
    }

    if (!pos) {
      // No pos - Just render original scene.
      renderSceneCB(outputBuffer);
      return;
    }

    const pixelRatio = renderer.getPixelRatio();
    pos = { x: pos.x * pixelRatio, y: pos.y * pixelRatio };

    let { width, height } = renderer.getSize(new THREE.Vector2());

    width *= pixelRatio;
    height *= pixelRatio;

    const maxViewportWidth = renderer
      .getContext()
      .getParameter(renderer.getContext().MAX_VIEWPORT_DIMS)[0];
    const maxViewportHeight = renderer
      .getContext()
      .getParameter(renderer.getContext().MAX_VIEWPORT_DIMS)[1];

    let resWidth = width;
    let resHeight = height;
    if (width * zoom > maxViewportWidth) {
      resWidth = width * ((width * zoom) / maxViewportWidth);
      resHeight = height * ((width * zoom) / maxViewportWidth);
    }

    // Set shader uniforms.
    this.magnifyMaterial.uniforms["zoomedTexture"].value =
      this.zoomTarget.texture;
    this.magnifyMaterial.uniforms["originalTexture"].value =
      (inputBuffer && inputBuffer.texture) || inputBuffer;
    this.magnifyMaterial.uniforms["pos"].value = pos;
    this.magnifyMaterial.uniforms["outlineColor"].value =
      this.outlineColor.set(outlineColor);
    this.magnifyMaterial.uniforms["mag_resolution"].value = {
      x: resWidth,
      y: resHeight,
    };
    this.magnifyMaterial.uniforms["resolution"].value = { x: width, y: height };
    this.magnifyMaterial.uniforms["zoom"].value = zoom;
    this.magnifyMaterial.uniforms["radius"].value = radius * pixelRatio;
    this.magnifyMaterial.uniforms["outlineThickness"].value =
      outlineThickness * pixelRatio;
    this.magnifyMaterial.uniforms["exp"].value = exp;

    // Make viewport centered according to pos.
    const zoomedViewport: THREE.Vector4Tuple = [
      (-pos.x * (zoom - 1) * width) / resWidth,
      (-pos.y * (zoom - 1) * height) / resHeight,
      ((width * width) / resWidth) * zoom,
      ((height * height) / resHeight) * zoom,
    ];

    this.zoomTarget.width = width;
    this.zoomTarget.height = height;
    this.zoomTarget.viewport.set(...zoomedViewport);

    const autoClearBackup = renderer.autoClear;
    renderer.autoClear = true; // Make sure autoClear is set.

    renderSceneCB(this.zoomTarget);

    if (antialias) {
      this.fxaaMaterial.uniforms["tDiffuse"].value = this.fxaaTarget.texture;
      this.fxaaMaterial.uniforms["resolution"].value = {
        x: 1 / width,
        y: 1 / height,
      };

      this.fxaaTarget.setSize(width, height);
      renderer.setRenderTarget(this.fxaaTarget);
      renderer.render(this.magnifyScene, this.camera); // Render magnify pass to fxaaTarget.
      renderer.setRenderTarget(null);
      renderer.render(this.fxaaScene, this.camera); // Render final pass to output buffer.
    } else {
      renderer.setRenderTarget(null);
      renderer.render(this.magnifyScene, this.camera); // Render magnify pass to outputBuffer.
    }

    renderer.autoClear = autoClearBackup;
  }
}
