import 'package:flutter/material.dart';

List<Widget> withDetailDividers(List<Widget> items) {
  if (items.isEmpty) return items;
  final out = <Widget>[items.first];
  for (var i = 1; i < items.length; i++) {
    out.add(const Divider(height: 1, indent: 52));
    out.add(items[i]);
  }
  return out;
}
