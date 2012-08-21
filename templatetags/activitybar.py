# -*- coding: utf-8 -*-
from django import template

register = template.Library()

@register.filter
def get_range( value ):
  """
    Filter - returns a list containing range made from given value
    Usage (in template):

    <ul>{% for i in 3|get_range %}
      <li>{{ i }}. Do something</li>
    {% endfor %}</ul>

    Results with the HTML:
    <ul>
      <li>0. Do something</li>
      <li>1. Do something</li>
      <li>2. Do something</li>
    </ul>

    Instead of 3 one may use the variable set in the views
  """
  return range( value )

@register.inclusion_tag('activitybar/activitybarscripts.html')
def activitybar_scripts():
    return {}

@register.inclusion_tag('activitybar/activitybarcss.html')
def activitybar_css():
    return {}

@register.inclusion_tag('activitybar/activitybar.html')
def activitybar_timeline(id, bins, classes):
    return { 'id': id, 'bins': bins, 'classes': classes }

@register.inclusion_tag('activitybar/playhead.html')
def activitybar_playhead(id, classes):
    return { 'id': id, 'classes': classes }
