'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  StarIcon,
  ChartBarIcon,
  QuestionMarkCircleIcon,
  GlobeAltIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const landingModules = [
  {
    name: 'Hero Slides',
    description: 'Gestiona las imágenes y contenido del banner principal',
    icon: PhotoIcon,
    href: '/landing/hero',
    color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    stats: 'Slides activos',
  },
  {
    name: 'Testimonios',
    description: 'Administra las reseñas y testimonios de clientes',
    icon: ChatBubbleLeftRightIcon,
    href: '/landing/testimonials',
    color: 'bg-gradient-to-br from-green-500 to-emerald-600',
    stats: 'Testimonios',
  },
  {
    name: 'Patrocinadores',
    description: 'Gestiona los logos y información de patrocinadores',
    icon: StarIcon,
    href: '/landing/sponsors',
    color: 'bg-gradient-to-br from-purple-500 to-pink-600',
    stats: 'Patrocinadores',
  },
  {
    name: 'Estadísticas',
    description: 'Configura las métricas y números destacados',
    icon: ChartBarIcon,
    href: '/landing/stats',
    color: 'bg-gradient-to-br from-orange-500 to-red-600',
    stats: 'Métricas',
  },
  {
    name: 'FAQ',
    description: 'Administra las preguntas frecuentes',
    icon: QuestionMarkCircleIcon,
    href: '/landing/faqs',
    color: 'bg-gradient-to-br from-teal-500 to-cyan-600',
    stats: 'Preguntas',
  },
];

export default function LandingPage() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <GlobeAltIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Administración de Landing Page
            </h1>
            <p className="text-gray-600">
              Gestiona todo el contenido de la página principal del sitio web
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PhotoIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hero Slides</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Testimonios</p>
              <p className="text-2xl font-bold text-gray-900">6</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <StarIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Patrocinadores</p>
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ChartBarIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Estadísticas</p>
              <p className="text-2xl font-bold text-gray-900">4</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {landingModules.map((module) => (
          <Link
            key={module.name}
            href={module.href}
            className="group block"
          >
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:-translate-y-1">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${module.color}`}>
                    <module.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {module.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {module.description}
                    </p>
                  </div>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Acciones Rápidas
        </h3>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/landing/hero"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PhotoIcon className="h-4 w-4 mr-2" />
            Agregar Hero Slide
          </Link>
          <Link
            href="/landing/testimonials"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
            Agregar Testimonio
          </Link>
          <Link
            href="/landing/sponsors"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <StarIcon className="h-4 w-4 mr-2" />
            Agregar Patrocinador
          </Link>
        </div>
      </div>
    </div>
  );
}
