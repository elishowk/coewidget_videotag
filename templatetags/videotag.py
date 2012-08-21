# -*- coding: utf-8 -*-
from django import template

register = template.Library()

@register.inclusion_tag('videotag/ticker.html')
def videotagticker(id, classes):
    return { 'id': id, 'classes': classes }

@register.inclusion_tag('videotag/postform.html')
def videotagpostform(id, classes):
    return { 'id': id, 'classes': classes }
